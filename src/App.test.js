import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { labPanelsByPatient } from './data/labs';
import { patients } from './data/patients';
import { matchPatientToInteraction } from './webex/patientMatcher';
import WebexCallPanel from './webex/WebexCallPanel';
import AgentLoginScreen from './webex/AgentLoginScreen';
import LabResultsPage from './components/pages/LabResultsPage';
import {
  classifyTranscriptTopic,
  getConfidentLabTarget,
  shouldAutoNavigateTopic
} from './webex/topicRouter';
import {
  compactTranscriptMessages,
  isRecoverableDisconnectedTask,
  extractTaskTranscript,
  isTerminalTask,
  isWrapupTask,
  normalizeRealTimeAssistance,
  normalizeTranscriptPayload,
  transcriptMessagesMatch
} from './webex/WebexProvider';

test('renders the clinical workspace and patient chart', () => {
  render(<App />);

  expect(screen.getAllByText('Where Does It Hurt').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Susan Parker').length).toBeGreaterThan(0);
  expect(screen.getByText('Latest vitals')).toBeInTheDocument();
});

test('allows confident topic navigation while respecting manual and automatic cooldowns', () => {
  const classification = { topic: 'appointments', confidence: 0.9 };
  const now = 100000;

  expect(shouldAutoNavigateTopic({ classification, currentPage: 'overview', now })).toBe(true);
  expect(shouldAutoNavigateTopic({
    classification: { topic: 'appointments', confidence: 0.89 },
    currentPage: 'overview',
    now
  })).toBe(false);
  expect(shouldAutoNavigateTopic({ classification, currentPage: 'appointments', now })).toBe(false);
  expect(shouldAutoNavigateTopic({
    classification: { topic: 'appointments', confidence: 0.7 },
    currentPage: 'overview',
    now
  })).toBe(false);
  expect(shouldAutoNavigateTopic({
    classification,
    currentPage: 'overview',
    lastManualNavigationAt: now - 5000,
    now
  })).toBe(false);
  expect(shouldAutoNavigateTopic({
    classification,
    currentPage: 'overview',
    lastAutomaticNavigationAt: now - 5000,
    now
  })).toBe(false);
});

test('selects only a valid lab target at 90 percent confidence', () => {
  const labTargets = [
    { id: 'LAB-1', name: 'Vitamin D' },
    { id: 'LAB-2', name: 'Comprehensive Metabolic Panel' }
  ];
  const classification = {
    topic: 'labs',
    confidence: 0.96,
    labTargetId: 'LAB-2',
    labConfidence: 0.9
  };

  expect(getConfidentLabTarget({ classification, labTargets })).toEqual(labTargets[1]);
  expect(getConfidentLabTarget({
    classification: { ...classification, labConfidence: 0.89 },
    labTargets
  })).toBeNull();
  expect(getConfidentLabTarget({
    classification: { ...classification, labTargetId: 'LAB-UNKNOWN' },
    labTargets
  })).toBeNull();
});

test('requests a structured topic classification from the PHP service', async () => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue({ topic: 'labs', confidence: 0.94 })
  });

  try {
    const result = await classifyTranscriptTopic({
      messages: [{ role: 'CALLER', content: 'What were my latest blood test results?' }],
      currentPage: 'overview',
      labTargets: [{ id: 'LAB-1', name: 'Vitamin D', analytes: ['Vitamin D, 25-Hydroxy'] }]
    });

    expect(result).toEqual({ topic: 'labs', confidence: 0.94 });
    expect(global.fetch).toHaveBeenCalledWith('./api/webex/topic.php', expect.objectContaining({
      method: 'POST',
      credentials: 'same-origin'
    }));
  } finally {
    global.fetch = originalFetch;
  }
});

test('opens an AI-requested lab panel', async () => {
  const patient = patients.find((candidate) => candidate.id === 'PT00001');

  render(
    <LabResultsPage
      patient={patient}
      requestedPanel={{ panelId: 'LAB-260521-02', requestedAt: 1 }}
      onManualPanelSelect={jest.fn()}
    />
  );

  expect(await screen.findByText(/LAB-260521-02/)).toBeInTheDocument();
  expect(screen.getAllByText('Comprehensive Metabolic Panel').length).toBeGreaterThan(1);
});

test('opens the clinical note workflow', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /new note/i }));

  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.getByLabelText(/reason for visit/i)).toBeInTheDocument();
});

test('signs a clinical note and adds it to activity', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /new note/i }));
  fireEvent.change(screen.getByLabelText(/reason for visit/i), { target: { value: 'Diabetes follow-up' } });
  fireEvent.change(screen.getByLabelText(/assessment/i), { target: { value: 'A1c remains above goal.' } });
  fireEvent.change(screen.getByLabelText(/plan/i), { target: { value: 'Continue medication and reinforce nutrition plan.' } });
  fireEvent.click(screen.getByRole('button', { name: /sign note/i }));

  expect(screen.getByText(/clinical note signed/i)).toBeInTheDocument();
  expect(screen.getByText(/Diabetes follow-up — signed by/i)).toBeInTheDocument();
});

test('searches and selects a patient', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /search patients/i }));
  fireEvent.change(screen.getByLabelText('Search patients'), { target: { value: 'Maria' } });
  fireEvent.click(screen.getByRole('button', { name: /Maria Rodriguez/i }));

  expect(screen.getAllByText('Maria Rodriguez').length).toBeGreaterThan(0);
  expect(screen.getByText(/MRN-138491/)).toBeInTheDocument();
});

test('acknowledges a critical lab result', () => {
  render(<App />);

  fireEvent.click(screen.getAllByRole('button', { name: 'Labs' })[0]);

  expect(screen.getByText(/Critical result:/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Acknowledge' }));

  expect(screen.queryByText(/Critical result:/)).not.toBeInTheDocument();
  expect(screen.getByText('Result marked as reviewed.')).toBeInTheDocument();
});

test('opens and resubmits a denied claim', () => {
  render(<App />);

  fireEvent.click(screen.getAllByRole('button', { name: 'Billing' })[0]);
  fireEvent.click(screen.getByText('CLM-260521-0719'));

  expect(screen.getByText(/Missing or incomplete referral information/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /resubmit claim/i }));

  expect(screen.getByText('Claim corrected and resubmitted.')).toBeInTheDocument();
  expect(screen.getAllByText('Insurance pending').length).toBeGreaterThan(0);
});

test('provides a chartable lab trend for every patient', () => {
  patients.forEach((patient) => {
    const panels = labPanelsByPatient[patient.id];
    expect(panels).toBeDefined();
    expect(panels.some((panel) => panel.trend?.length >= 4)).toBe(true);
  });
});

test('keeps the user on labs when switching patients from the chart header', () => {
  render(<App />);

  fireEvent.click(screen.getAllByRole('button', { name: 'Labs' })[0]);
  fireEvent.click(screen.getByRole('button', { name: /Susan Parker/i }));
  fireEvent.click(screen.getByRole('menuitem', { name: /Maria Rodriguez/i }));

  expect(screen.getByRole('heading', { name: 'Laboratory' })).toBeInTheDocument();
  expect(screen.getByText(/results, trends, and review status for Maria Rodriguez/i)).toBeInTheDocument();
  expect(screen.getByText('Vitamin D, 25-Hydroxy trend')).toBeInTheDocument();
});

test('opens labs from the chart overview shortcut', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /view labs/i }));

  expect(screen.getByRole('heading', { name: 'Laboratory' })).toBeInTheDocument();
  expect(screen.getByText(/results, trends, and review status for Susan Parker/i)).toBeInTheDocument();
});

test('matches Webex interaction data to a patient', () => {
  const byMrn = matchPatientToInteraction(patients, {
    callAssociatedData: { MRN: { value: 'MRN-138491' } }
  });
  const byAni = matchPatientToInteraction(patients, {
    callAssociatedDetails: { ani: '+13125550148' }
  });

  expect(byMrn.patient.name).toBe('Maria Rodriguez');
  expect(byAni.patient.name).toBe('Susan Parker');
});

test('matches Webex nested CAD arrays by patient number and phone', () => {
  const byPatientNumber = matchPatientToInteraction(patients, {
    data: {
      interaction: {
        callAssociatedData: [
          { name: 'patientNumber', value: 'PT92011' },
          { name: 'phoneNumber', value: '+18475550166' }
        ]
      }
    }
  });
  const byNestedAni = matchPatientToInteraction(patients, {
    interaction: {
      media: {
        callAssociatedData: [
          { key: 'ANI', value: '+17735550108' }
        ]
      }
    }
  });

  expect(byPatientNumber.patient.name).toBe('Dmitri Vasilyev');
  expect(byNestedAni.patient.name).toBe('Maria Rodriguez');
});

test('matches Webex CAD when identity fields are siblings of interaction metadata', () => {
  const bySiblingCad = matchPatientToInteraction(patients, {
    data: {
      interaction: { id: 'opaque-interaction-metadata' },
      callAssociatedData: [
        { variableName: 'patientId', variableValue: 'PT29845' },
        { variableName: 'MRN', variableValue: 'MRN-129845' }
      ]
    }
  });
  const byMapCad = matchPatientToInteraction(patients, {
    data: {
      callAssociatedDetails: new Map([
        ['MRN', { value: 'MRN-138491' }],
        ['ANI', { value: '+17735550108' }]
      ])
    }
  });

  expect(bySiblingCad.patient.name).toBe('Susan Parker');
  expect(byMapCad.patient.name).toBe('Maria Rodriguez');
});

test('treats disconnected hydrated tasks without wrap-up as stale', () => {
  const disconnectedTask = {
    data: {
      type: 'CONTACT_ENDED',
      interactionId: 'ended-1',
      interaction: { state: 'disconnected' }
    }
  };
  const wrapupTask = {
    data: {
      interactionId: 'wrapup-1',
      agentsPendingWrapUp: ['agent-1'],
      interaction: { state: 'disconnected' }
    }
  };
  const recoverableDisconnectedTask = {
    wrapup: jest.fn(),
    data: {
      type: 'CONTACT_ENDED',
      interactionId: 'recoverable-ended-1',
      interaction: { state: 'disconnected' }
    }
  };

  expect(isTerminalTask(disconnectedTask)).toBe(true);
  expect(isWrapupTask(wrapupTask)).toBe(true);
  expect(isTerminalTask(wrapupTask)).toBe(false);
  expect(isRecoverableDisconnectedTask(recoverableDisconnectedTask)).toBe(true);
});

test('extracts IVR and realtime transcript payloads from Webex tasks', () => {
  const taskTranscript = extractTaskTranscript({
    data: {
      interaction: {
        convIvrTranscript: 'Caller said they need a same-day appointment.',
        IvrPath: 'Main menu > nurse triage',
        pathId: 'triage'
      }
    }
  });
  const nestedTaskTranscript = extractTaskTranscript({
    data: {
      interaction: {
        callAssociatedData: {
          convIvrTranscript: 'Caller entered billing from the IVR.',
          IvrPath: 'Main menu > billing',
          pathId: 'billing'
        }
      }
    }
  });
  const liveMessages = normalizeTranscriptPayload({
    data: {
      transcript: [
        { role: 'customer', content: 'I am having chest tightness.', messageId: 'm1', publishTimestamp: 10 },
        { speaker: 'agent', text: 'I can help with that.', id: 'm2', timestamp: 20 }
      ]
    }
  });
  const nestedLiveMessages = normalizeTranscriptPayload({
    data: {
      type: 'REAL_TIME_TRANSCRIPTION',
      data: {
        content: 'hello from transcript'
      }
    }
  });

  expect(taskTranscript.ivrTranscript).toMatch(/same-day appointment/);
  expect(taskTranscript.ivrPath).toBe('Main menu > nurse triage');
  expect(nestedTaskTranscript.ivrTranscript).toMatch(/billing from the IVR/);
  expect(nestedTaskTranscript.ivrPath).toBe('Main menu > billing');
  expect(liveMessages).toHaveLength(2);
  expect(liveMessages[1].content).toBe('I can help with that.');
  expect(nestedLiveMessages).toHaveLength(1);
  expect(nestedLiveMessages[0].content).toBe('hello from transcript');
});

test('deduplicates transcript lines returned by live and historic sources', () => {
  const firstSync = compactTranscriptMessages([
    { id: 'a1', role: 'AGENT', content: 'All I can help you with scheduling an appointment.', timestamp: 10 },
    { id: 'a2', role: 'agent', content: 'All I can help you with   scheduling an appointment.', timestamp: 20 },
    { id: 'c1', role: 'CALLER', content: 'Yeah, I would like to schedule an appointment, please.', timestamp: 30 },
    { id: 'c2', role: 'caller', content: 'Yeah, I would like to schedule an appointment, please.', timestamp: 40 }
  ]);
  const secondSync = compactTranscriptMessages([
    ...firstSync,
    { id: 'a3', role: 'AGENT', content: 'All I can help you with scheduling an appointment.', timestamp: 50 },
    { id: 'c3', role: 'CALLER', content: 'Tomorrow morning would be best.', timestamp: 60 }
  ]);

  expect(firstSync).toHaveLength(2);
  expect(secondSync).toHaveLength(3);
  expect(secondSync.map((message) => message.id)).toEqual(['a1', 'c1', 'c3']);
});

test('replaces interim transcript text with the completed utterance', () => {
  const compacted = compactTranscriptMessages([
    { id: 'p1', role: 'CALLER', content: 'And you tell me', timestamp: 1000 },
    { id: 'p2', role: 'CALLER', content: 'And you tell me about your', timestamp: 2000 },
    { id: 'p3', role: 'CALLER', content: 'And you tell me about your company', timestamp: 3000 },
    { id: 'p4', role: 'CALLER', content: 'And you tell me about your company?', timestamp: 4000 }
  ]);

  expect(compacted).toEqual([
    { id: 'p4', role: 'CALLER', content: 'And you tell me about your company?', timestamp: 4000 }
  ]);
});

test('recognizes text revisions when Webex reuses a transcript message ID', () => {
  const initial = compactTranscriptMessages([
    { id: 'message-1', utteranceId: 'utterance-1', role: 'AGENT', content: 'Can', timestamp: 1000, isFinal: false }
  ]);
  const revised = compactTranscriptMessages([
    ...initial,
    { id: 'message-1', utteranceId: 'utterance-1', role: 'AGENT', content: 'Can I help you?', timestamp: 2000, isFinal: true }
  ]);

  expect(revised).toEqual([
    { id: 'message-1', utteranceId: 'utterance-1', role: 'AGENT', content: 'Can I help you?', timestamp: 2000, isFinal: true }
  ]);
  expect(transcriptMessagesMatch(revised, initial)).toBe(false);
});

test('assembles tokenized Webex transcript chunks until the utterance is final', () => {
  const compacted = compactTranscriptMessages([
    { id: 't1', utteranceId: 'utterance-2', role: 'AGENT', content: 'Can', timestamp: 1000, isFinal: false },
    { id: 't2', utteranceId: 'utterance-2', role: 'AGENT', content: 'I', timestamp: 1100, isFinal: false },
    { id: 't3', utteranceId: 'utterance-2', role: 'AGENT', content: 'help', timestamp: 1200, isFinal: false },
    { id: 't4', utteranceId: 'utterance-2', role: 'AGENT', content: 'you', timestamp: 1300, isFinal: false },
    { id: 't5', utteranceId: 'utterance-2', role: 'AGENT', content: '?', timestamp: 1400, isFinal: true }
  ]);

  expect(compacted).toEqual([
    {
      id: 't5',
      utteranceId: 'utterance-2',
      role: 'AGENT',
      content: 'Can I help you?',
      timestamp: 1400,
      isFinal: true
    }
  ]);
});

test('replaces overlapping progressive transcript phrases without repeating words', () => {
  const compacted = compactTranscriptMessages([
    { id: 'p1', utteranceId: 'utterance-3', role: 'CALLER', content: 'Ok, where is my load?', timestamp: 1000, isFinal: false },
    { id: 'p2', utteranceId: 'utterance-3', role: 'CALLER', content: 'And', timestamp: 1100, isFinal: false },
    { id: 'p3', utteranceId: 'utterance-3', role: 'CALLER', content: 'And what is the', timestamp: 1200, isFinal: false },
    { id: 'p4', utteranceId: 'utterance-3', role: 'CALLER', content: 'And what is the name of my d', timestamp: 1300, isFinal: false },
    { id: 'p5', utteranceId: 'utterance-3', role: 'CALLER', content: 'And what is the name of my driver?', timestamp: 1400, isFinal: true }
  ]);

  expect(compacted).toEqual([
    {
      id: 'p5',
      utteranceId: 'utterance-3',
      role: 'CALLER',
      content: 'Ok, where is my load? And what is the name of my driver?',
      timestamp: 1400,
      isFinal: true
    }
  ]);
});

test('extracts text and card identity from Webex real-time assistance', () => {
  const normalized = normalizeRealTimeAssistance({
    data: {
      adaptiveCardId: 'card-123',
      adaptiveCard: JSON.stringify({
        body: [
          { type: 'TextBlock', text: 'Confirm the requested appointment date.' },
          { type: 'TextBlock', text: 'Offer the earliest available provider.' }
        ]
      })
    }
  });

  expect(normalized.adaptiveCardId).toBe('card-123');
  expect(normalized.messages).toEqual([
    'Confirm the requested appointment date.',
    'Offer the earliest available provider.'
  ]);
});

test('starts a standalone demo call from the patient chart', () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /call patient/i }));

  expect(screen.getByText(/demo call started/i)).toBeInTheDocument();
  expect(screen.getByText('Standalone demo')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'End' })).toBeInTheDocument();
});

test('shows answer and decline controls for an offered call', () => {
  const onAccept = jest.fn();
  const onDecline = jest.fn();

  render(
    <WebexCallPanel
      task={{
        interactionId: 'incoming-1',
        state: 'Incoming call',
        offered: true,
        direction: 'INBOUND',
        queueName: 'Patient Services',
        phone: '(312) 555-0148'
      }}
      patient={patients[0]}
      mode="contact-center"
      onAccept={onAccept}
      onDecline={onDecline}
      onHold={jest.fn()}
      onResume={jest.fn()}
      onToggleMute={jest.fn()}
      onEnd={jest.fn()}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Answer' }));
  expect(onAccept).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument();
  expect(screen.getByText('Webex CC')).toBeInTheDocument();
});

test('toggles mute during an active call', async () => {
  const onToggleMute = jest.fn().mockResolvedValue(undefined);

  render(
    <WebexCallPanel
      task={{
        interactionId: 'active-1',
        state: 'Connected',
        offered: false,
        direction: 'INBOUND',
        queueName: 'Patient Services',
        phone: '(312) 555-0148'
      }}
      patient={patients[0]}
      mode="contact-center"
      onAccept={jest.fn()}
      onDecline={jest.fn()}
      onHold={jest.fn()}
      onResume={jest.fn()}
      onToggleMute={onToggleMute}
      onEnd={jest.fn()}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Mute' }));

  expect(onToggleMute).toHaveBeenCalledTimes(1);
  expect(await screen.findByRole('button', { name: 'Unmute' })).toBeInTheDocument();
});

test('shows IVR and live transcript details in the call panel', () => {
  render(
    <WebexCallPanel
      task={{
        interactionId: 'transcript-1',
        state: 'Connected',
        offered: false,
        direction: 'INBOUND',
        queueName: 'Patient Services',
        phone: '(312) 555-0148'
      }}
      patient={patients[0]}
      mode="contact-center"
      onAccept={jest.fn()}
      onDecline={jest.fn()}
      onHold={jest.fn()}
      onResume={jest.fn()}
      onToggleMute={jest.fn()}
      onEnd={jest.fn()}
      transcript={{
        ivrTranscript: 'Caller requested billing support before transfer.',
        ivrPath: 'Main menu > billing',
        status: 'live',
        messages: [
          {
            id: 'live-1',
            role: 'customer',
            content: 'I need help understanding my claim.',
            timestamp: 1
          }
        ]
      }}
      topicRouting={{
        status: 'classified',
        topic: 'labs',
        label: 'Labs',
        confidence: 0.94,
        labTargetLabel: 'Comprehensive Metabolic Panel',
        labConfidence: 0.97
      }}
    />
  );

  expect(screen.getByText('Transcript')).toBeInTheDocument();
  expect(screen.getByText(/IVR path: Main menu > billing/)).toBeInTheDocument();
  expect(screen.getByText(/Caller requested billing support/)).toBeInTheDocument();
  expect(screen.getByText('I need help understanding my claim.')).toBeInTheDocument();
  expect(screen.getByText('Conversation topic')).toBeInTheDocument();
  expect(screen.getByText('Labs · 94%')).toBeInTheDocument();
  expect(screen.getByText('Lab target: Comprehensive Metabolic Panel · 97%')).toBeInTheDocument();
  expect(screen.getByTestId('live-transcript-scroll')).toBeInTheDocument();
});

test('scrolls to revised live transcript text', async () => {
  const task = {
    interactionId: 'transcript-scroll-1',
    state: 'Connected',
    offered: false,
    direction: 'INBOUND',
    queueName: 'Patient Services',
    phone: '(312) 555-0148'
  };
  const panelProps = {
    task,
    patient: patients[0],
    mode: 'contact-center',
    onAccept: jest.fn(),
    onDecline: jest.fn(),
    onHold: jest.fn(),
    onResume: jest.fn(),
    onToggleMute: jest.fn(),
    onEnd: jest.fn()
  };
  const { rerender } = render(
    <WebexCallPanel
      {...panelProps}
      transcript={{
        status: 'live',
        messages: [{ id: 'live-scroll-1', role: 'agent', content: 'Can', timestamp: 1 }]
      }}
    />
  );
  const transcriptScroll = screen.getByTestId('live-transcript-scroll');
  Object.defineProperty(transcriptScroll, 'scrollHeight', { configurable: true, value: 320 });
  Object.defineProperty(transcriptScroll, 'scrollTo', { configurable: true, value: undefined });
  transcriptScroll.scrollTop = 0;

  rerender(
    <WebexCallPanel
      {...panelProps}
      transcript={{
        status: 'live',
        messages: [{ id: 'live-scroll-1', role: 'agent', content: 'Can I help you?', timestamp: 2 }]
      }}
    />
  );

  await waitFor(() => expect(transcriptScroll.scrollTop).toBe(320));
});

test('shows transcript listening state before Webex sends text', () => {
  render(
    <WebexCallPanel
      task={{
        interactionId: 'transcript-empty-1',
        state: 'Connected',
        offered: false,
        direction: 'INBOUND',
        queueName: 'Patient Services',
        phone: '(312) 555-0148'
      }}
      patient={patients[0]}
      mode="contact-center"
      onAccept={jest.fn()}
      onDecline={jest.fn()}
      onHold={jest.fn()}
      onResume={jest.fn()}
      onToggleMute={jest.fn()}
      onEnd={jest.fn()}
      transcript={{
        status: 'listening',
        messages: []
      }}
    />
  );

  expect(screen.getByText('Transcript')).toBeInTheDocument();
  expect(screen.getByText(/Listening for live transcript chunks/)).toBeInTheDocument();
});

test('shows when Webex returns no transcript history', () => {
  render(
    <WebexCallPanel
      task={{
        interactionId: 'transcript-history-empty-1',
        state: 'Wrap-up required',
        wrappingUp: true,
        offered: false,
        direction: 'INBOUND',
        queueName: 'Patient Services',
        phone: '(312) 555-0148'
      }}
      patient={patients[0]}
      mode="contact-center"
      onAccept={jest.fn()}
      onDecline={jest.fn()}
      onHold={jest.fn()}
      onResume={jest.fn()}
      onToggleMute={jest.fn()}
      onEnd={jest.fn()}
      transcript={{
        status: 'history-empty',
        messages: []
      }}
    />
  );

  expect(screen.getByText(/did not return transcript history/)).toBeInTheDocument();
});

test('requests and refines Webex real-time assistance', async () => {
  const onRequestAssistance = jest.fn().mockResolvedValue({ accepted: true });

  render(
    <WebexCallPanel
      task={{
        interactionId: 'assistance-1',
        state: 'Connected',
        offered: false,
        direction: 'INBOUND',
        queueName: 'Patient Services',
        phone: '(312) 555-0148'
      }}
      patient={patients[0]}
      mode="contact-center"
      onAccept={jest.fn()}
      onDecline={jest.fn()}
      onHold={jest.fn()}
      onResume={jest.fn()}
      onToggleMute={jest.fn()}
      onEnd={jest.fn()}
      transcript={{ status: 'live', messages: [] }}
      assistance={{
        status: 'ready',
        messages: ['Confirm the preferred appointment time.'],
        error: ''
      }}
      onRequestAssistance={onRequestAssistance}
    />
  );

  expect(screen.getByText('Confirm the preferred appointment time.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /get assistance/i }));
  expect(onRequestAssistance).toHaveBeenCalledWith('');

  fireEvent.change(screen.getByLabelText('Add context'), {
    target: { value: 'Focus on tomorrow morning.' }
  });
  fireEvent.click(screen.getByRole('button', { name: /refine assistance/i }));

  await waitFor(() => {
    expect(onRequestAssistance).toHaveBeenCalledWith('Focus on tomorrow morning.');
  });
});

test('selects and submits a post-call wrapup code', async () => {
  const onSubmitWrapup = jest.fn().mockResolvedValue(undefined);

  render(
    <WebexCallPanel
      task={{
        interactionId: 'wrapup-1',
        state: 'Wrap-up required',
        wrappingUp: true,
        offered: false,
        direction: 'INBOUND',
        queueName: 'Patient Services',
        phone: '(312) 555-0148'
      }}
      patient={patients[0]}
      mode="contact-center"
      onAccept={jest.fn()}
      onDecline={jest.fn()}
      onHold={jest.fn()}
      onResume={jest.fn()}
      onToggleMute={jest.fn()}
      onEnd={jest.fn()}
      wrapupCodes={[
        { id: 'resolved', name: 'Patient issue resolved' },
        { id: 'follow-up', name: 'Clinical follow-up required' }
      ]}
      onSubmitWrapup={onSubmitWrapup}
    />
  );

  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Wrap-up code' }));
  fireEvent.click(screen.getByRole('option', { name: 'Clinical follow-up required' }));
  fireEvent.click(screen.getByRole('button', { name: 'Complete wrap-up' }));

  await waitFor(() => {
    expect(onSubmitWrapup).toHaveBeenCalledWith({
      id: 'follow-up',
      name: 'Clinical follow-up required'
    });
  });
});

test('offers duplicate agent session recovery', () => {
  const onClearExistingSession = jest.fn();
  const onRecoverExistingSession = jest.fn();

  render(
    <AgentLoginScreen
      stage="station-setup"
      configured
      profile={{ teams: [{ teamId: 'team-1', teamName: 'Main' }], loginVoiceOptions: ['BROWSER'], webRtcEnabled: true }}
      error="AGENT_SESSION_ALREADY_EXISTS"
      duplicateSession
      teamId="team-1"
      loginOption="BROWSER"
      dialNumber=""
      onTeamChange={jest.fn()}
      onLoginOptionChange={jest.fn()}
      onDialNumberChange={jest.fn()}
      onWebexLogin={jest.fn()}
      onStationLogin={jest.fn()}
      onClearExistingSession={onClearExistingSession}
      onRecoverExistingSession={onRecoverExistingSession}
      onRetry={jest.fn()}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: /recover task/i }));
  expect(onRecoverExistingSession).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: /clear session/i }));
  expect(onClearExistingSession).toHaveBeenCalledTimes(1);
});
