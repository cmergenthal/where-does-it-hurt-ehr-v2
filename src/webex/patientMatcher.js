export const normalizePhone = (value) => String(value || '').replace(/\D/g, '').slice(-10);

const normalizeKey = (key) => String(key || '').replace(/[^a-z0-9]/gi, '').toLowerCase();

const readValue = (value) => {
  if (value && typeof value === 'object') {
    if ('value' in value) return readValue(value.value);
    if ('displayValue' in value) return readValue(value.displayValue);
    if ('stringValue' in value) return readValue(value.stringValue);
    if ('variableValue' in value) return readValue(value.variableValue);
    if ('defaultValue' in value) return readValue(value.defaultValue);
    if ('text' in value) return readValue(value.text);
    if (Array.isArray(value.values)) return readValue(value.values[0]);
  }
  return value;
};

const getEntryKey = (item) =>
  item.key ||
  item.name ||
  item.id ||
  item.label ||
  item.fieldName ||
  item.variableName ||
  item.displayName;

const getEntryValue = (item) =>
  readValue(
    item.value ??
    item.displayValue ??
    item.stringValue ??
    item.variableValue ??
    item.defaultValue ??
    item.text ??
    item.values
  );

const findValueByKeys = (source, keys, seen = new WeakSet(), depth = 0) => {
  if (!source || depth > 6) return '';
  if (typeof source !== 'object') return '';
  if (seen.has(source)) return '';
  seen.add(source);

  const normalizedKeys = keys.map(normalizeKey);

  if (source instanceof Map) {
    for (const [key, value] of source.entries()) {
      if (normalizedKeys.includes(normalizeKey(key))) {
        const mapValue = readValue(value);
        if (mapValue) return mapValue;
      }

      const nestedValue = findValueByKeys(value, keys, seen, depth + 1);
      if (nestedValue) return nestedValue;
    }
    return '';
  }

  if (Array.isArray(source)) {
    for (const item of source) {
      if (item && typeof item === 'object') {
        const entryKey = getEntryKey(item);
        if (normalizedKeys.includes(normalizeKey(entryKey))) {
          const entryValue = getEntryValue(item);
          if (entryValue) return entryValue;
        }
      }

      const nestedValue = findValueByKeys(item, keys, seen, depth + 1);
      if (nestedValue) return nestedValue;
    }
    return '';
  }

  for (const [key, value] of Object.entries(source)) {
    if (normalizedKeys.includes(normalizeKey(key))) {
      const directValue = readValue(value);
      if (directValue) return directValue;
    }
  }

  for (const value of Object.values(source)) {
    const nestedValue = findValueByKeys(value, keys, seen, depth + 1);
    if (nestedValue) return nestedValue;
  }

  return '';
};

const patientIdKeys = [
  'patientId',
  'patientID',
  'PatientId',
  'patient_id',
  'patientNumber',
  'patient_number',
  'Patient Number',
  'PatientNumber',
  'patientNo'
];

const mrnKeys = [
  'mrn',
  'MRN',
  'medicalRecordNumber',
  'medical_record_number',
  'medicalRecordNo',
  'patientMrn',
  'patientMRN'
];

const phoneKeys = [
  'ani',
  'ANI',
  'phone',
  'phoneNumber',
  'phone_number',
  'callerPhone',
  'callerNumber',
  'callingNumber',
  'callingPartyNumber',
  'customerNumber',
  'customerPhone',
  'dn',
  'from'
];

const callerNameKeys = ['callerName', 'customerName', 'name'];

export const getInteractionIdentity = (interaction = {}) => {
  return {
    patientId: findValueByKeys(interaction, patientIdKeys),
    mrn: findValueByKeys(interaction, mrnKeys),
    phone: findValueByKeys(interaction, phoneKeys),
    callerName: findValueByKeys(interaction, callerNameKeys)
  };
};

export const matchPatientToInteraction = (patients, interaction) => {
  const identity = getInteractionIdentity(interaction);
  const normalizedPhone = normalizePhone(identity.phone);

  const patient = patients.find((candidate) =>
    (identity.patientId && candidate.id.toLowerCase() === String(identity.patientId).toLowerCase()) ||
    (identity.mrn && candidate.mrn.toLowerCase() === String(identity.mrn).toLowerCase()) ||
    (normalizedPhone && normalizePhone(candidate.phone) === normalizedPhone)
  );

  return { patient: patient || null, identity };
};
