export const EHR_TOPIC_LABELS = {
  overview: 'Chart overview',
  patients: 'Patients',
  labs: 'Labs',
  appointments: 'Appointments',
  documents: 'Documents',
  billing: 'Billing'
};

export const shouldAutoNavigateTopic = ({
  classification,
  currentPage,
  lastManualNavigationAt = 0,
  lastAutomaticNavigationAt = 0,
  now = Date.now()
}) => Boolean(
  EHR_TOPIC_LABELS[classification?.topic] &&
  classification.topic !== currentPage &&
  Number(classification.confidence) >= 0.9 &&
  now - lastManualNavigationAt >= 12000 &&
  now - lastAutomaticNavigationAt >= 18000
);

export const getConfidentLabTarget = ({
  classification,
  labTargets,
  lastManualNavigationAt = 0,
  lastAutomaticNavigationAt = 0,
  now = Date.now()
}) => {
  if (
    classification?.topic !== 'labs' ||
    Number(classification.confidence) < 0.9 ||
    Number(classification.labConfidence) < 0.9 ||
    now - lastManualNavigationAt < 12000 ||
    now - lastAutomaticNavigationAt < 18000
  ) return null;

  return labTargets.find((target) => target.id === classification.labTargetId) || null;
};

export const classifyTranscriptTopic = async ({ messages, currentPage, labTargets = [], signal }) => {
  const response = await fetch('./api/webex/topic.php', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: messages.slice(-12), currentPage, labTargets }),
    signal
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || payload.error || 'Topic classification failed.');
  }

  return payload;
};
