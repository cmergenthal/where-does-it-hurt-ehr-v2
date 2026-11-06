import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AgentLoginScreen from './AgentLoginScreen';
import {
  beginWebexLogin,
  initializeContactCenter,
  registerContactCenterEvents,
  resetWebexLogin
} from './contactCenterService';
import { getInteractionIdentity } from './patientMatcher';

const WebexContext = createContext(null);

const normalizeStatus = (value) => String(value || '').replace(/[^a-z0-9]/gi, '').toLowerCase();

export const isWrapupTask = (task) => {
  const data = task?.data || task || {};
  const interaction = data.interaction || {};
  const participantValues = Object.values(interaction.participants || {});

  return Boolean(
    data.wrapUpRequired ||
    data.agentsPendingWrapUp?.length ||
    interaction.state === 'WRAPUP' ||
    interaction.state === 'wrapup' ||
    participantValues.some((participant) => participant?.isWrapUp)
  );
};

export const isTerminalTask = (task) => {
  if (!task || isWrapupTask(task)) return false;

  const data = task?.data || task || {};
  const interaction = data.interaction || data.task || {};
  const statusValues = [
    data.state,
    data.status,
    data.type,
    data.eventType,
    data.reason,
    data.reasonCode,
    interaction.state,
    interaction.status
  ].map(normalizeStatus);

  return statusValues.some((status) =>
    status === 'disconnected' ||
    status === 'disconnect' ||
    status === 'ended' ||
    status === 'end' ||
    status === 'completed' ||
    status === 'closed' ||
    status === 'terminated' ||
    status === 'contactended' ||
    status === 'agentwrappedup' ||
    status.includes('disconnect') ||
    status.includes('ended')
  );
};

const getTaskData = (task) => task?.data || task?.interaction || task || {};

const getFirstValue = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

export const extractTaskTranscript = (task) => {
  const data = getTaskData(task);
  const interaction = data.interaction || data.task || {};
  const details = data.callAssociatedData || data.callAssociatedDetails || data.attributes || {};
  const interactionDetails =
    interaction.callAssociatedData ||
    interaction.callAssociatedDetails ||
    interaction.attributes ||
    {};
  const nestedData = data.data || interaction.data || {};
  const nestedDetails =
    nestedData.callAssociatedData ||
    nestedData.callAssociatedDetails ||
    nestedData.attributes ||
    {};

  return {
    ivrTranscript: getFirstValue(
      interaction.convIvrTranscript,
      data.convIvrTranscript,
      interactionDetails.convIvrTranscript,
      details.convIvrTranscript,
      nestedData.convIvrTranscript,
      nestedDetails.convIvrTranscript
    ) || '',
    ivrPath: getFirstValue(
      interaction.IvrPath,
      interaction.ivrPath,
      data.IvrPath,
      data.ivrPath,
      interactionDetails.IvrPath,
      interactionDetails.ivrPath,
      details.IvrPath,
      details.ivrPath,
      nestedData.IvrPath,
      nestedData.ivrPath,
      nestedDetails.IvrPath,
      nestedDetails.ivrPath
    ) || '',
    pathId: getFirstValue(
      interaction.pathId,
      data.pathId,
      interactionDetails.pathId,
      details.pathId,
      nestedData.pathId,
      nestedDetails.pathId
    ) || ''
  };
};

const normalizeTranscriptMessage = (message, source = 'live') => {
  if (!message) return null;

  if (typeof message === 'string') {
    return {
      id: `${source}-${message}`,
      role: source === 'ivr' ? 'IVR' : 'Transcript',
      content: message,
      timestamp: Date.now(),
      source
    };
  }

  const content =
    message.content ||
    message.data?.content ||
    message.data?.displayText ||
    message.data?.text ||
    message.data?.transcript ||
    message.data?.utterance ||
    message.data?.message ||
    message.text ||
    message.transcript ||
    message.utterance ||
    message.message ||
    message.displayText ||
    '';

  if (!content) return null;

  return {
    id: message.messageId || message.id || `${source}-${message.publishTimestamp || message.timestamp || content}`,
    utteranceId: message.utteranceId || message.data?.utteranceId || '',
    role: message.role || message.data?.role || message.speaker || message.data?.speaker || message.participantRole || message.source || 'Transcript',
    content,
    timestamp: message.publishTimestamp || message.timestamp || message.createdTime || Date.now(),
    isFinal: message.isFinal ?? message.data?.isFinal ?? null,
    source
  };
};

export const normalizeTranscriptPayload = (payload, source = 'live') => {
  const candidates =
    payload?.data?.messages ||
    payload?.data?.transcripts ||
    payload?.data?.transcript ||
    payload?.data?.data?.messages ||
    payload?.data?.data?.transcripts ||
    payload?.data?.data?.transcript ||
    payload?.data?.data ||
    payload?.messages ||
    payload?.transcripts ||
    payload?.transcript ||
    payload?.data ||
    payload;

  const list = Array.isArray(candidates) ? candidates : [candidates];
  return list.map((message) => normalizeTranscriptMessage(message, source)).filter(Boolean);
};

const getTranscriptFingerprint = (message) => [
  String(message.role || '').trim().toLowerCase(),
  String(message.content || '').replace(/\s+/g, ' ').trim().toLowerCase()
].join('::');

const normalizeTranscriptContent = (content) =>
  String(content || '').replace(/\s+/g, ' ').trim().toLowerCase();

const joinTranscriptChunks = (previousContent, nextContent) => {
  const previous = String(previousContent || '').trim();
  const next = String(nextContent || '').trim();
  if (!previous) return next;
  if (!next) return previous;
  return `${previous}${/^[,.;!?]/.test(next) ? '' : ' '}${next}`;
};

const getCommonPrefixWordCount = (left, right) => {
  const leftWords = normalizeTranscriptContent(left).split(' ');
  const rightWords = normalizeTranscriptContent(right).split(' ');
  let count = 0;

  while (count < leftWords.length && count < rightWords.length && leftWords[count] === rightWords[count]) {
    count += 1;
  }

  return count;
};

const mergeOverlappingTranscriptContent = (previousContent, nextContent) => {
  const previousWords = String(previousContent || '').trim().split(/\s+/);
  const nextWords = String(nextContent || '').trim().split(/\s+/);
  const normalizeWord = (word) => word.toLowerCase().replace(/^\W+|\W+$/g, '');

  for (let overlap = Math.min(previousWords.length, nextWords.length); overlap > 0; overlap -= 1) {
    const previousSuffix = previousWords.slice(-overlap);
    const nextPrefix = nextWords.slice(0, overlap);
    const matches = previousSuffix.every((word, index) => {
      const previousWord = normalizeWord(word);
      const nextWord = normalizeWord(nextPrefix[index]);
      if (previousWord === nextWord) return true;
      return overlap > 1 && index === overlap - 1 && nextWord.startsWith(previousWord);
    });

    if (matches) {
      return [...previousWords.slice(0, -overlap), ...nextWords].join(' ');
    }
  }

  return '';
};

const mergeTranscriptRevision = (previous, next) => {
  const previousContent = normalizeTranscriptContent(previous.content);
  const nextContent = normalizeTranscriptContent(next.content);

  if (nextContent.startsWith(previousContent)) return next;
  if (previousContent.startsWith(nextContent)) {
    return {
      ...previous,
      id: next.id || previous.id,
      timestamp: Math.max(Number(previous.timestamp) || 0, Number(next.timestamp) || 0),
      isFinal: next.isFinal ?? previous.isFinal
    };
  }

  const overlappingContent = mergeOverlappingTranscriptContent(previous.content, next.content);
  if (overlappingContent) {
    return {
      ...next,
      utteranceId: next.utteranceId || previous.utteranceId,
      content: overlappingContent
    };
  }

  const commonPrefixWords = getCommonPrefixWordCount(previous.content, next.content);
  if (commonPrefixWords && previousContent.includes(' ') && nextContent.includes(' ')) return next;

  return {
    ...next,
    utteranceId: next.utteranceId || previous.utteranceId,
    content: joinTranscriptChunks(previous.content, next.content)
  };
};

const isTranscriptRevision = (previous, next) => {
  if (!previous || !next) return false;
  if (String(previous.role || '').trim().toLowerCase() !== String(next.role || '').trim().toLowerCase()) return false;

  const previousContent = normalizeTranscriptContent(previous.content);
  const nextContent = normalizeTranscriptContent(next.content);
  if (!previousContent || !nextContent) return false;

  const previousTimestamp = Number(previous.timestamp);
  const nextTimestamp = Number(next.timestamp);
  const closeInTime =
    !Number.isFinite(previousTimestamp) ||
    !Number.isFinite(nextTimestamp) ||
    Math.abs(nextTimestamp - previousTimestamp) <= 15000;

  if (previous.utteranceId && next.utteranceId && previous.utteranceId === next.utteranceId) return true;
  if (previous.isFinal === false && closeInTime) return true;

  return closeInTime && (
    nextContent.startsWith(previousContent) ||
    previousContent.startsWith(nextContent)
  );
};

export const transcriptMessagesMatch = (left, right) =>
  left.length === right.length && left.every((message, index) => {
    const candidate = right[index];
    return (
      message.id === candidate?.id &&
      message.utteranceId === candidate?.utteranceId &&
      message.role === candidate?.role &&
      message.content === candidate?.content &&
      message.isFinal === candidate?.isFinal
    );
  });

export const compactTranscriptMessages = (messages) => {
  const seen = new Set();

  return messages
    .filter((message) => message?.content)
    .sort((left, right) => left.timestamp - right.timestamp)
    .reduce((compacted, message) => {
      const fingerprint = getTranscriptFingerprint(message);
      const previous = compacted[compacted.length - 1];
      if (seen.has(fingerprint)) {
        if (
          previous?.utteranceId &&
          previous.utteranceId === message.utteranceId &&
          message.isFinal &&
          !previous.isFinal
        ) {
          compacted[compacted.length - 1] = message;
        }
        return compacted;
      }

      if (isTranscriptRevision(previous, message)) {
        compacted[compacted.length - 1] = mergeTranscriptRevision(previous, message);
        seen.add(fingerprint);
        return compacted;
      }

      seen.add(fingerprint);

      compacted.push(message);
      return compacted;
    }, []);
};

const assistanceTextKeys = new Set(['text', 'title', 'content', 'message', 'response', 'suggestion', 'summary']);

export const normalizeRealTimeAssistance = (payload) => {
  const messages = [];
  const visited = new WeakSet();
  let adaptiveCardId = '';

  const visit = (value, key = '') => {
    if (value === null || value === undefined) return;

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return;

      if (key.toLowerCase() === 'adaptivecardid') {
        adaptiveCardId ||= trimmed;
        return;
      }

      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          visit(JSON.parse(trimmed), key);
          return;
        } catch (parseError) {
          if (assistanceTextKeys.has(key.toLowerCase())) messages.push(trimmed);
          return;
        }
      }

      if (assistanceTextKeys.has(key.toLowerCase())) messages.push(trimmed);
      return;
    }

    if (typeof value !== 'object' || visited.has(value)) return;
    visited.add(value);

    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, key));
      return;
    }

    Object.entries(value).forEach(([entryKey, entryValue]) => visit(entryValue, entryKey));
  };

  visit(payload);

  return {
    adaptiveCardId,
    messages: Array.from(new Set(messages))
  };
};

const normalizeTask = (task) => {
  if (!task) return null;

  const interaction = task.interaction || task.data?.interaction || task.data || task;
  const identity = getInteractionIdentity(task);
  const wrappingUp = task.forceWrapup || isWrapupTask(task);
  if (!wrappingUp && isTerminalTask(task)) return null;

  return {
    interactionId: task.interactionId || interaction.interactionId || interaction.id || '',
    mediaType: interaction.mediaType || interaction.channelType || 'telephony',
    state: wrappingUp ? 'Wrap-up required' : interaction.state || task.state || 'Connected',
    direction: interaction.contactDirection?.type || interaction.direction || 'INBOUND',
    queueName: interaction.queueName || interaction.virtualTeamName || interaction.queue?.name || 'Patient Services',
    phone: identity.phone || '',
    startedAt: interaction.createdTimestamp || interaction.startTime || new Date().toISOString(),
    wrappingUp,
    raw: interaction
  };
};

export const canRecoverWrapupTask = (task) =>
  Boolean(task?.wrapup || task?.sdkTask?.wrapup || isWrapupTask(task));

export const isRecoverableDisconnectedTask = (task) =>
  !isWrapupTask(task) && isTerminalTask(task) && canRecoverWrapupTask(task);

const normalizeSdkTask = (task, lifecycle = 'active') => {
  const forceWrapup = lifecycle === 'wrapup' || isRecoverableDisconnectedTask(task);
  const normalized = normalizeTask({
    interactionId: task?.data?.interactionId || task?.interactionId,
    interaction: task?.data || task,
    forceWrapup
  });

  return normalized ? {
    ...normalized,
    state: lifecycle === 'incoming' ? 'Incoming call' : normalized.state,
    offered: lifecycle === 'incoming' && !normalized.wrappingUp,
    sdkTask: task,
    raw: task?.data || task
  } : null;
};

export function WebexProvider({ children }) {
  const isTest = process.env.NODE_ENV === 'test';
  const webexRef = useRef(null);
  const cleanupEventsRef = useRef(null);
  const audioRef = useRef(null);
  const taskCleanupRef = useRef(null);
  const initializedRef = useRef(false);
  const initializeWebexRef = useRef(null);
  const transcriptFallbackRef = useRef({ timeout: null, interval: null, inFlight: false, interactionId: null });
  const [stage, setStage] = useState(isTest ? 'active' : 'initializing');
  const [configured, setConfigured] = useState(isTest);
  const [profile, setProfile] = useState(isTest ? { teams: [], loginVoiceOptions: [] } : null);
  const [teamId, setTeamId] = useState('');
  const [loginOption, setLoginOption] = useState('');
  const [dialNumber, setDialNumber] = useState('');
  const [agentState, setAgentStateValue] = useState({
    status: isTest ? 'LoggedIn' : 'Disconnected',
    subStatus: isTest ? 'Available' : '',
    teamName: isTest ? 'Lakeshore Clinic' : ''
  });
  const [activeTask, setActiveTask] = useState(null);
  const [transcript, setTranscript] = useState({
    ivrTranscript: '',
    ivrPath: '',
    pathId: '',
    messages: [],
    status: 'idle'
  });
  const [assistance, setAssistance] = useState({
    status: 'idle',
    messages: [],
    adaptiveCardId: '',
    raw: null,
    error: ''
  });
  const [screenPop, setScreenPop] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [authDiagnostics, setAuthDiagnostics] = useState(null);
  const [duplicateSession, setDuplicateSession] = useState(false);

  const resetTranscriptForTask = useCallback((task) => {
    const taskTranscript = extractTaskTranscript(task);
    const realtimeEnabled = webexRef.current?.cc?.apiAIAssistant?.aiFeature?.realtimeTranscripts?.enable;
    setTranscript({
      ...taskTranscript,
      messages: [],
      status: taskTranscript.ivrTranscript
        ? 'ivr-loaded'
        : realtimeEnabled === false
          ? 'not-enabled'
        : 'listening'
    });
  }, []);

  const mergeTranscriptForTask = useCallback((task) => {
    const taskTranscript = extractTaskTranscript(task);
    const realtimeEnabled = webexRef.current?.cc?.apiAIAssistant?.aiFeature?.realtimeTranscripts?.enable;

    setTranscript((current) => ({
      ivrTranscript: current.ivrTranscript || taskTranscript.ivrTranscript,
      ivrPath: current.ivrPath || taskTranscript.ivrPath,
      pathId: current.pathId || taskTranscript.pathId,
      messages: current.messages,
      status: current.messages.length
        ? current.status
        : taskTranscript.ivrTranscript
          ? 'ivr-loaded'
          : current.status === 'idle'
            ? realtimeEnabled === false ? 'not-enabled' : 'listening'
            : current.status
    }));
  }, []);

  const appendTranscriptMessages = useCallback((messages) => {
    if (!messages.length) return;

    setTranscript((current) => {
      const compactedMessages = compactTranscriptMessages([...current.messages, ...messages]);
      if (transcriptMessagesMatch(compactedMessages, current.messages)) return current;

      return {
        ...current,
        messages: compactedMessages,
        status: 'live'
      };
    });
  }, []);

  const getTranscriptRequestIds = useCallback((task) => {
    const data = getTaskData(task);
    const interaction = data.interaction || data.task || {};

    return {
      interactionId:
        data.interactionId ||
        interaction.interactionId ||
        data.data?.conversationId ||
        data.data?.interactionId ||
        task?.interactionId,
      agentId:
        data.agentId ||
        data.owner ||
        interaction.agentId ||
        webexRef.current?.cc?.taskManager?.getAgentId?.() ||
        profile?.agentId
    };
  }, [profile?.agentId]);

  const fetchHistoricTranscript = useCallback(async (task) => {
    if (isTest || !webexRef.current?.cc?.apiAIAssistant?.fetchHistoricTranscripts) return;
    if (webexRef.current.cc.apiAIAssistant.aiFeature?.realtimeTranscripts?.enable === false) {
      setTranscript((current) => ({ ...current, status: 'not-enabled' }));
      return;
    }

    const { agentId, interactionId } = getTranscriptRequestIds(task);
    if (!interactionId || !agentId) return;

    try {
      setTranscript((current) => ({ ...current, status: 'loading-history' }));
      const history = await webexRef.current.cc.apiAIAssistant.fetchHistoricTranscripts(agentId, interactionId);
      const messages = normalizeTranscriptPayload(history?.data || [], 'historic');
      appendTranscriptMessages(messages);
      setTranscript((current) => ({
        ...current,
        status: messages.length ? 'history-loaded' : 'history-empty'
      }));
    } catch (historyError) {
      setTranscript((current) => ({ ...current, status: 'history-unavailable' }));
      setNotice(historyError.message || 'Transcript history is not available for this interaction.');
    }
  }, [appendTranscriptMessages, getTranscriptRequestIds, isTest]);

  const syncTranscriptFallback = useCallback(async (task) => {
    const fallback = transcriptFallbackRef.current;
    if (
      isTest ||
      fallback.inFlight ||
      !webexRef.current?.cc?.apiAIAssistant?.fetchHistoricTranscripts ||
      webexRef.current.cc.apiAIAssistant.aiFeature?.realtimeTranscripts?.enable === false
    ) return;

    const { agentId, interactionId } = getTranscriptRequestIds(task);
    if (!interactionId || !agentId) return;

    fallback.inFlight = true;
    try {
      const history = await webexRef.current.cc.apiAIAssistant.fetchHistoricTranscripts(agentId, interactionId);
      if (fallback.interactionId !== interactionId) return;
      const messages = normalizeTranscriptPayload(history?.data || [], 'historic');
      appendTranscriptMessages(messages);
    } catch (fallbackError) {
      setTranscript((current) => ({
        ...current,
        status: current.status === 'loading-history' ? 'listening' : current.status
      }));
    } finally {
      fallback.inFlight = false;
    }
  }, [appendTranscriptMessages, getTranscriptRequestIds, isTest]);

  const stopTranscriptFallback = useCallback(() => {
    const fallback = transcriptFallbackRef.current;
    if (fallback.timeout) window.clearTimeout(fallback.timeout);
    if (fallback.interval) window.clearInterval(fallback.interval);
    fallback.timeout = null;
    fallback.interval = null;
    fallback.interactionId = null;
  }, []);

  const startTranscriptFallback = useCallback((task) => {
    const fallback = transcriptFallbackRef.current;
    if (isTest || fallback.timeout || fallback.interval) return;
    const { interactionId } = getTranscriptRequestIds(task);
    if (!interactionId) return;

    fallback.interactionId = interactionId;
    fallback.timeout = window.setTimeout(() => {
      fallback.timeout = null;
      syncTranscriptFallback(task);
      fallback.interval = window.setInterval(() => {
        syncTranscriptFallback(task);
      }, 3000);
    }, 5000);
  }, [getTranscriptRequestIds, isTest, syncTranscriptFallback]);

  const attachTaskListeners = useCallback((task) => {
    taskCleanupRef.current?.();
    if (!task?.on) return;

    resetTranscriptForTask(task);
    setAssistance({ status: 'idle', messages: [], adaptiveCardId: '', raw: null, error: '' });
    const taskData = getTaskData(task);
    const interactionState = normalizeStatus(taskData.interaction?.state || taskData.state);
    if (interactionState !== 'new') {
      startTranscriptFallback(task);
    }

    const subscriptions = [];
    const on = (eventName, handler) => {
      task.on(eventName, handler);
      subscriptions.push(() => task.off?.(eventName, handler));
    };

    on('task:assigned', (assignedTask) => {
      mergeTranscriptForTask(assignedTask || task);
      startTranscriptFallback(assignedTask || task);
      setActiveTask((current) => current ? { ...current, state: 'Connected', offered: false } : current);
    });
    on('task:media', (track) => {
      if (!audioRef.current || !track) return;
      audioRef.current.srcObject = new MediaStream([track]);
      audioRef.current.play().catch(() => {
        setNotice('Browser blocked call audio. Click anywhere in the app, then answer again.');
      });
    });
    on('task:hold', (heldTask) => {
      mergeTranscriptForTask(heldTask || task);
      setActiveTask((current) => current ? { ...current, state: 'On hold' } : current);
    });
    on('task:resume', (resumedTask) => {
      mergeTranscriptForTask(resumedTask || task);
      setActiveTask((current) => current ? { ...current, state: 'Connected' } : current);
    });
    on('task:end', (endedTask) => {
      mergeTranscriptForTask(endedTask || task);
      stopTranscriptFallback();
      const taskData = endedTask?.data || task?.data || {};
      if (taskData.wrapUpRequired) {
        setActiveTask((current) => current ? {
          ...current,
          state: 'Wrap-up required',
          offered: false,
          wrappingUp: true
        } : current);
        fetchHistoricTranscript(endedTask || task);
      } else {
        setActiveTask(null);
      }
    });
    on('task:wrapup', () => {
      mergeTranscriptForTask(task);
      stopTranscriptFallback();
      setActiveTask((current) => current ? {
        ...current,
        state: 'Wrap-up required',
        offered: false,
        wrappingUp: true
      } : current);
      fetchHistoricTranscript(task);
    });
    on('REAL_TIME_TRANSCRIPTION', (payload) => {
      stopTranscriptFallback();
      appendTranscriptMessages(normalizeTranscriptPayload(payload, 'live'));
    });
    on('SUGGESTED_RESPONSE', (payload) => {
      const normalized = normalizeRealTimeAssistance(payload);
      console.info('[Webex AI Assistant] SUGGESTED_RESPONSE', payload);
      setAssistance({
        status: normalized.messages.length ? 'ready' : 'response-received',
        messages: normalized.messages,
        adaptiveCardId: normalized.adaptiveCardId,
        raw: payload,
        error: ''
      });
    });
    on('AgentContact', (payload) => {
      mergeTranscriptForTask({ data: payload });
    });
    on('AgentOfferContact', (payload) => {
      mergeTranscriptForTask({ data: payload });
    });
    on('AgentContactAssigned', (payload) => {
      mergeTranscriptForTask({ data: payload });
    });
    on('AgentWrapup', (payload) => {
      mergeTranscriptForTask({ data: payload });
    });
    on('task:wrappedup', () => {
      stopTranscriptFallback();
      setActiveTask(null);
    });
    on('task:unassigned', () => {
      stopTranscriptFallback();
      setActiveTask(null);
    });
    on('task:rejected', () => {
      stopTranscriptFallback();
      setActiveTask(null);
    });

    taskCleanupRef.current = () => {
      stopTranscriptFallback();
      subscriptions.forEach((unsubscribe) => unsubscribe());
    };
  }, [appendTranscriptMessages, fetchHistoricTranscript, mergeTranscriptForTask, resetTranscriptForTask, startTranscriptFallback, stopTranscriptFallback]);

  const registerAgent = useCallback(async (webex) => {
    setStage('registering');
    setError('');
    setDuplicateSession(false);

    const agentProfile = await webex.cc.register();
    setProfile(agentProfile);
    setTeamId(agentProfile.teams?.[0]?.teamId || agentProfile.teams?.[0]?.id || '');

    const options = (agentProfile.loginVoiceOptions || [])
      .filter((option) => option !== 'BROWSER' || agentProfile.webRtcEnabled);
    setLoginOption(options.includes('BROWSER') ? 'BROWSER' : options[0] || '');
    setStage('station-setup');
  }, []);

  const initialize = useCallback(async () => {
    if (isTest) return;

    setStage('initializing');
    setError('');
    setDuplicateSession(false);

    try {
      const runtime = await initializeContactCenter();
      setConfigured(runtime.configured);
      setAuthDiagnostics(runtime.authDiagnostics || null);

      if (!runtime.configured) {
        setStage('unauthenticated');
        return;
      }

      webexRef.current = runtime.webex;

      if (!runtime.webex) {
        setError(runtime.authIssue || '');
        setStage('unauthenticated');
        return;
      }

      cleanupEventsRef.current = registerContactCenterEvents(runtime.webex, {
        onAgentState: (data) => {
          setAgentStateValue((current) => ({
            ...current,
            status: data?.status || data?.state || current.status,
            subStatus: data?.subStatus || data?.state || current.subStatus
          }));
        },
        onStationLogin: (data) => {
          setAgentStateValue((current) => ({
            ...current,
            status: data?.status || 'LoggedIn',
            subStatus: data?.state || data?.subStatus || 'Idle'
          }));
        },
        onStationLogout: () => {
          setActiveTask(null);
          setStage('station-setup');
        },
        onAgentMultiLogin: () => {
          setActiveTask(null);
          setDuplicateSession(true);
          setError('This agent is already logged into another station or browser session.');
          setStage('station-setup');
        },
        onTask: (task, lifecycle) => {
          const normalizedTask = normalizeSdkTask(
            task,
            lifecycle === 'hydrate' && isRecoverableDisconnectedTask(task) ? 'wrapup' : lifecycle
          );
          if (!normalizedTask) {
            setActiveTask(null);
            setTranscript((current) => ({ ...current, messages: [], status: 'idle' }));
            return;
          }

          attachTaskListeners(task);
          if (lifecycle === 'hydrate') {
            fetchHistoricTranscript(task);
          }
          setActiveTask(normalizedTask);
        }
      });

      if (runtime.canAuthorize || runtime.webex.credentials?.canAuthorize || runtime.webex.canAuthorize) {
        await registerAgent(runtime.webex);
      } else {
        setError(runtime.authIssue || '');
        setStage('unauthenticated');
      }
    } catch (initializationError) {
      setError(initializationError.message || 'Unable to initialize Webex Contact Center.');
      setStage('error');
    }
  }, [attachTaskListeners, fetchHistoricTranscript, isTest, registerAgent]);

  initializeWebexRef.current = initialize;

  useEffect(() => {
    if (initializedRef.current) return undefined;
    initializedRef.current = true;

    initializeWebexRef.current?.();

    return () => {
      cleanupEventsRef.current?.();
      taskCleanupRef.current?.();
      webexRef.current?.cc?.deregister?.().catch(() => {});
    };
  }, []);

  const login = useCallback(async () => {
    setError('');
    setAuthDiagnostics(null);
    setDuplicateSession(false);
    try {
      await beginWebexLogin(webexRef.current);
    } catch (loginError) {
      setError(loginError.message || 'Unable to start Webex login.');
    }
  }, []);

  const resetLogin = useCallback(async () => {
    setError('');
    setAuthDiagnostics(null);
    setDuplicateSession(false);
    await resetWebexLogin(webexRef.current);
    setStage('unauthenticated');
  }, []);

  const stationLogin = useCallback(async () => {
    if (!webexRef.current) return;

    setStage('station-login');
    setError('');
    setDuplicateSession(false);

    try {
      const payload = { teamId, loginOption };
      if (loginOption === 'AGENT_DN' || loginOption === 'EXTENSION') {
        payload.dialNumber = dialNumber;
      }

      const response = await webexRef.current.cc.stationLogin(payload);
      const selectedTeam = profile?.teams?.find(
        (team) => (team.teamId || team.id) === teamId
      );

      setAgentStateValue({
        status: response?.status || 'LoggedIn',
        subStatus: response?.state || response?.subStatus || 'Idle',
        teamName: selectedTeam?.teamName || selectedTeam?.name || 'Contact Center'
      });
      await webexRef.current.cc.setAgentState({ state: 'Available', auxCodeId: '0' });
      setAgentStateValue((current) => ({ ...current, subStatus: 'Available' }));
      setStage('active');
    } catch (stationError) {
      const errorText = [
        stationError.message,
        stationError.reason,
        stationError.details?.data?.reason,
        stationError.details?.data?.reasonCode
      ].filter(Boolean).join(' ');
      const isDuplicateSession = errorText.includes('AGENT_SESSION_ALREADY_EXISTS');

      setDuplicateSession(isDuplicateSession);
      setError(errorText || 'Station login failed.');
      setStage('station-setup');
    }
  }, [dialNumber, loginOption, profile?.teams, teamId]);

  const clearExistingSession = useCallback(async () => {
    if (!webexRef.current) return;

    setStage('station-login');
    setError('');

    try {
      await webexRef.current.cc.stationLogout({
        logoutReason: 'Replacing existing EHR agent session'
      });
      setDuplicateSession(false);
      setNotice('Existing agent session cleared. Starting a new station session…');

      const payload = { teamId, loginOption };
      if (loginOption === 'AGENT_DN' || loginOption === 'EXTENSION') {
        payload.dialNumber = dialNumber;
      }

      const response = await webexRef.current.cc.stationLogin(payload);
      const selectedTeam = profile?.teams?.find(
        (team) => (team.teamId || team.id) === teamId
      );

      setAgentStateValue({
        status: response?.status || 'LoggedIn',
        subStatus: response?.state || response?.subStatus || 'Idle',
        teamName: selectedTeam?.teamName || selectedTeam?.name || 'Contact Center'
      });
      await webexRef.current.cc.setAgentState({ state: 'Available', auxCodeId: '0' });
      setAgentStateValue((current) => ({ ...current, subStatus: 'Available' }));
      setStage('active');
    } catch (clearError) {
      setDuplicateSession(true);
      setError(
        clearError.message ||
        'The existing session could not be cleared. Sign out of Agent Desktop or ask a Contact Center administrator to force-log out the agent.'
      );
      setStage('station-setup');
    }
  }, [dialNumber, loginOption, profile?.teams, teamId]);

  const recoverExistingSession = useCallback(() => {
    const taskManager = webexRef.current?.cc?.taskManager;
    const existingTasks = Object.values(taskManager?.getAllTasks?.() || {});
    const existingTask = existingTasks.find(isWrapupTask) ||
      existingTasks.find(isRecoverableDisconnectedTask) ||
      existingTasks.find((task) => !isTerminalTask(task));
    const existingTaskLifecycle = existingTask && (
      isWrapupTask(existingTask) || isRecoverableDisconnectedTask(existingTask)
        ? 'wrapup'
        : 'hydrate'
    );
    const selectedTeam = profile?.teams?.find(
      (team) => (team.teamId || team.id) === teamId
    );

    if (existingTask) {
      attachTaskListeners(existingTask);
      setActiveTask(normalizeSdkTask(existingTask, existingTaskLifecycle));
      if (existingTaskLifecycle === 'wrapup') {
        fetchHistoricTranscript(existingTask);
      }
      setNotice('Recovered the existing Webex task. Complete wrap-up from the call panel.');
    } else {
      setNotice('Recovered the agent session. Waiting for Webex to hydrate any active task…');
    }

    setDuplicateSession(false);
    setError('');
    setAgentStateValue((current) => ({
      ...current,
      status: 'LoggedIn',
      subStatus: existingTaskLifecycle === 'wrapup' ? 'Wrap-up' : current.subStatus || 'State unknown',
      teamName: selectedTeam?.teamName || selectedTeam?.name || current.teamName || 'Contact Center'
    }));
    setStage('active');
  }, [attachTaskListeners, fetchHistoricTranscript, profile?.teams, teamId]);

  const changeAgentState = useCallback(async (state, auxCodeId = '0') => {
    if (isTest) {
      setAgentStateValue((current) => ({ ...current, subStatus: state }));
      return;
    }

    if (!webexRef.current?.cc?.setAgentState) {
      setNotice('Webex agent session is not ready to change state yet.');
      return;
    }

    try {
      await webexRef.current.cc.setAgentState({ state, auxCodeId });
      setAgentStateValue((current) => ({ ...current, subStatus: state }));
      setNotice('');
    } catch (stateError) {
      setNotice(stateError?.message || `Unable to change agent state to ${state}.`);
      setAgentStateValue((current) => ({
        ...current,
        subStatus: current.subStatus || 'State unknown'
      }));
    }
  }, [isTest]);

  const logout = useCallback(async () => {
    try {
      if (!isTest && webexRef.current) {
        await webexRef.current.cc.stationLogout({ logoutReason: 'userInitiated' });
      }
      setActiveTask(null);
      setTranscript((current) => ({ ...current, messages: [], status: 'idle' }));
      setStage(isTest ? 'active' : 'station-setup');
      setAgentStateValue((current) => ({ ...current, status: 'LoggedOut', subStatus: '' }));
    } catch (logoutError) {
      setNotice(logoutError.message || 'Unable to log out agent station.');
    }
  }, [isTest]);

  const startOutdial = useCallback(async (phone) => {
    try {
      if (isTest) {
        setActiveTask({
          interactionId: `DEMO-${Date.now()}`,
          mediaType: 'telephony',
          state: 'Connected',
          direction: 'OUTBOUND',
          queueName: 'Standalone demo',
          phone,
          startedAt: new Date().toISOString(),
          raw: { callAssociatedDetails: { ani: phone } }
        });
        setTranscript({
          ivrTranscript: 'Demo IVR: patient selected appointment follow-up before routing to the clinic.',
          ivrPath: 'Main menu > appointments > follow-up',
          pathId: 'DEMO-IVR',
          messages: [],
          status: 'ivr-loaded'
        });
        setNotice(`Demo call started to ${phone}.`);
        return;
      }

      const task = await webexRef.current.cc.startOutdial(phone);
      attachTaskListeners(task);
      setActiveTask(normalizeSdkTask(task));
    } catch (outdialError) {
      setNotice(outdialError.message || 'Unable to start outbound call.');
    }
  }, [attachTaskListeners, isTest]);

  const accept = useCallback(async () => {
    if (!activeTask?.sdkTask?.accept) return;

    setActiveTask((current) => current ? { ...current, state: 'Connecting…' } : current);
    try {
      await activeTask.sdkTask.accept();
      setActiveTask((current) => current ? { ...current, state: 'Connected', offered: false } : current);
    } catch (acceptError) {
      setActiveTask((current) => current ? { ...current, state: 'Incoming call', offered: true } : current);
      setNotice(acceptError.message || 'Unable to answer the incoming call.');
    }
  }, [activeTask]);

  const decline = useCallback(async () => {
    if (!activeTask?.sdkTask?.decline) return;

    try {
      await activeTask.sdkTask.decline();
      setActiveTask(null);
    } catch (declineError) {
      setNotice(declineError.message || 'Unable to decline the incoming call.');
    }
  }, [activeTask]);

  const hold = useCallback(async () => activeTask?.sdkTask?.hold?.(), [activeTask]);
  const resume = useCallback(async () => activeTask?.sdkTask?.resume?.(), [activeTask]);
  const toggleMute = useCallback(async () => activeTask?.sdkTask?.toggleMute?.(), [activeTask]);
  const requestRealTimeAssistance = useCallback(async (context = '') => {
    const api = webexRef.current?.cc?.apiAIAssistant;

    if (isTest) {
      const demoPayload = {
        adaptiveCardId: 'demo-assistance-card',
        body: [{ text: context || 'Confirm the preferred appointment date, time, and provider before scheduling.' }]
      };
      const normalized = normalizeRealTimeAssistance(demoPayload);
      setAssistance({ status: 'ready', ...normalized, raw: demoPayload, error: '' });
      return demoPayload;
    }

    if (!api?.getRealTimeAssistance) {
      const message = 'This Webex SDK does not provide real-time assistance.';
      setAssistance((current) => ({ ...current, status: 'unavailable', error: message }));
      return null;
    }

    if (api.aiFeature?.suggestedResponses?.enable === false) {
      const message = 'Real-time assistance is not enabled for this Webex tenant or agent.';
      setAssistance((current) => ({ ...current, status: 'not-enabled', error: message }));
      return null;
    }

    const task = activeTask?.sdkTask || activeTask;
    const { agentId, interactionId } = getTranscriptRequestIds(task);
    if (!agentId || !interactionId) {
      const message = 'The active Webex interaction is missing an agent or interaction ID.';
      setAssistance((current) => ({ ...current, status: 'unavailable', error: message }));
      return null;
    }

    setAssistance((current) => ({ ...current, status: 'requesting', error: '' }));
    try {
      const response = await api.getRealTimeAssistance({
        agentId,
        interactionId,
        context: context.trim() || undefined,
        languageCode: 'en'
      });
      console.info('[Webex AI Assistant] getRealTimeAssistance acknowledgment', response);
      setAssistance((current) => ({
        ...current,
        status: current.messages.length ? 'ready' : 'waiting',
        raw: current.messages.length ? current.raw : response,
        error: ''
      }));
      return response;
    } catch (assistanceError) {
      const message = assistanceError?.message || 'Webex AI Assistant could not provide assistance.';
      console.error('[Webex AI Assistant] getRealTimeAssistance failed', assistanceError);
      setAssistance((current) => ({ ...current, status: 'error', error: message }));
      return null;
    }
  }, [activeTask, getTranscriptRequestIds, isTest]);
  const recoverActiveTaskToWrapup = useCallback((task, message = 'Call media was already disconnected. Complete wrap-up from the call panel.') => {
    if (!task) return;

    setActiveTask((current) => current ? {
      ...current,
      state: 'Wrap-up required',
      offered: false,
      wrappingUp: true
    } : {
      ...task,
      state: 'Wrap-up required',
      offered: false,
      wrappingUp: true
    });
    fetchHistoricTranscript(task.sdkTask || task);
    setNotice(message);
  }, [fetchHistoricTranscript]);

  const end = useCallback(async () => {
    if (!activeTask?.sdkTask?.end) {
      if (canRecoverWrapupTask(activeTask)) {
        recoverActiveTaskToWrapup(activeTask);
      } else {
        setActiveTask(null);
      }
      return;
    }

    try {
      await activeTask.sdkTask.end();
      if (activeTask.sdkTask.data?.wrapUpRequired || canRecoverWrapupTask(activeTask)) {
        recoverActiveTaskToWrapup(activeTask, 'Call ended. Complete wrap-up from the call panel.');
      } else {
        setActiveTask(null);
      }
    } catch (endError) {
      if (canRecoverWrapupTask(activeTask)) {
        recoverActiveTaskToWrapup(activeTask);
        return;
      }

      setNotice(endError?.message || 'Unable to end the call.');
    }
  }, [activeTask, recoverActiveTaskToWrapup]);

  const submitWrapup = useCallback(async (code) => {
    if (!activeTask?.sdkTask?.wrapup || !code) return;

    try {
      await activeTask.sdkTask.wrapup({
        auxCodeId: code.id,
        wrapUpReason: code.name
      });
      setNotice(`Wrap-up completed: ${code.name}.`);
      setActiveTask(null);
      setTranscript((current) => ({ ...current, status: 'complete' }));
    } catch (wrapupError) {
      setNotice(wrapupError.message || 'Unable to submit the wrap-up code.');
    }
  }, [activeTask]);

  const clearNotice = useCallback(() => setNotice(''), []);
  const clearScreenPop = useCallback(() => setScreenPop(null), []);

  const value = useMemo(() => ({
    mode: isTest ? 'standalone' : 'contact-center',
    sessionStage: stage,
    profile,
    agentState,
    activeTask,
    transcript,
    assistance,
    screenPop,
    notice,
    clearNotice,
    clearScreenPop,
    startOutdial,
    accept,
    decline,
    hold,
    resume,
    toggleMute,
    requestRealTimeAssistance,
    end,
    submitWrapup,
    changeAgentState,
    logout
  }), [
    activeTask,
    accept,
    agentState,
    assistance,
    changeAgentState,
    clearNotice,
    clearScreenPop,
    end,
    hold,
    isTest,
    logout,
    notice,
    profile,
    decline,
    resume,
    requestRealTimeAssistance,
    toggleMute,
    transcript,
    submitWrapup,
    screenPop,
    stage,
    startOutdial
  ]);

  if (stage !== 'active') {
    return (
      <AgentLoginScreen
        stage={stage}
        configured={configured}
        profile={profile}
        error={error}
        authDiagnostics={authDiagnostics}
        teamId={teamId}
        loginOption={loginOption}
        dialNumber={dialNumber}
        onTeamChange={setTeamId}
        onLoginOptionChange={setLoginOption}
        onDialNumberChange={setDialNumber}
        onWebexLogin={login}
        onResetLogin={resetLogin}
        onStationLogin={stationLogin}
        onClearExistingSession={clearExistingSession}
        onRecoverExistingSession={recoverExistingSession}
        duplicateSession={duplicateSession}
        onRetry={initialize}
      />
    );
  }

  return (
    <WebexContext.Provider value={value}>
      {children}
      <audio ref={audioRef} autoPlay playsInline hidden aria-label="Webex call audio" />
    </WebexContext.Provider>
  );
}

export const useWebex = () => {
  const context = useContext(WebexContext);
  if (!context) throw new Error('useWebex must be used within WebexProvider');
  return context;
};
