export const patients = [
  {
    name: 'Susan Parker',
    preferredName: 'Susan',
    dob: '1974-08-12',
    id: 'PT29845',
    mrn: 'MRN-104829',
    phone: '(312) 555-0148',
    email: 'susan.parker@example.com',
    address: '1234 Elm St, Chicago, IL 60614',
    gender: 'Female',
    pronouns: 'she/her',
    photo: 'https://randomuser.me/api/portraits/women/50.jpg',
    primaryProvider: 'Dr. Sarah Reynolds',
    insurance: 'BlueCross PPO',
    pharmacy: 'Lakeview Community Pharmacy',
    allergies: [
      { substance: 'Penicillin', reaction: 'Hives', severity: 'High', firstNoted: '2008-04-11' },
      { substance: 'Latex', reaction: 'Contact dermatitis', severity: 'Moderate', firstNoted: '2017-09-03' }
    ],
    conditions: [
      { name: 'Type 2 diabetes', code: 'E11.9', status: 'Active', onset: '2023-11-05' },
      { name: 'Essential hypertension', code: 'I10', status: 'Active', onset: '2021-07-22' },
      { name: 'Hyperlipidemia', code: 'E78.5', status: 'Active', onset: '2019-03-18' }
    ],
    medications: [
      { name: 'Metformin', dose: '500 mg', frequency: 'Twice daily', status: 'Active', startDate: '2023-11-10', notes: 'With meals' },
      { name: 'Lisinopril', dose: '10 mg', frequency: 'Once daily', status: 'Active', startDate: '2021-08-01', notes: 'Blood pressure' },
      { name: 'Atorvastatin', dose: '20 mg', frequency: 'Nightly', status: 'Active', startDate: '2019-03-20', notes: 'Cholesterol' }
    ],
    vitals: {
      bloodPressure: '128/82',
      heartRate: '74',
      temperature: '98.6',
      weight: '163',
      bmi: '27.1',
      measuredAt: '2026-06-18T09:30:00'
    },
    nextAppointment: '2026-07-02T10:00:00',
    lastVisit: '2026-06-18T09:30:00',
    alerts: [
      { severity: 'warning', title: 'A1c above target', detail: '7.5% on June 18, 2026' },
      { severity: 'info', title: 'Annual eye exam due', detail: 'Due by August 12, 2026' }
    ],
    recentActivity: [
      { date: '2026-06-18', type: 'Office visit', detail: 'Diabetes follow-up with Dr. Reynolds' },
      { date: '2026-06-18', type: 'Lab result', detail: 'Hemoglobin A1c resulted at 7.5%' },
      { date: '2026-05-29', type: 'Medication', detail: 'Metformin refill approved' }
    ]
  },
  {
    name: 'Alaric Blackwood',
    preferredName: 'Alaric',
    dob: '1982-03-21',
    id: 'PT00001',
    mrn: 'MRN-100001',
    phone: '(312) 555-0191',
    email: 'alaric.blackwood@example.com',
    address: '88 W Chestnut St, Chicago, IL 60610',
    gender: 'Male',
    pronouns: 'he/him',
    photo: 'https://randomuser.me/api/portraits/men/11.jpg',
    primaryProvider: 'Dr. Amir Patel',
    insurance: 'Aetna Choice POS',
    pharmacy: 'Near North Pharmacy',
    allergies: [],
    conditions: [
      { name: 'Migraine without aura', code: 'G43.009', status: 'Active', onset: '2020-02-14' }
    ],
    medications: [
      { name: 'Sumatriptan', dose: '50 mg', frequency: 'As needed', status: 'Active', startDate: '2020-03-01', notes: 'Maximum 2 doses per day' }
    ],
    vitals: {
      bloodPressure: '118/76',
      heartRate: '68',
      temperature: '98.2',
      weight: '181',
      bmi: '24.6',
      measuredAt: '2026-05-21T14:15:00'
    },
    nextAppointment: '2026-08-14T13:30:00',
    lastVisit: '2026-05-21T14:15:00',
    alerts: [],
    recentActivity: [
      { date: '2026-05-21', type: 'Office visit', detail: 'Migraine management follow-up' },
      { date: '2026-05-21', type: 'Medication', detail: 'Sumatriptan renewed' }
    ]
  },
  {
    name: 'Maria Rodriguez',
    preferredName: 'Maria',
    dob: '1968-02-11',
    id: 'PT38491',
    mrn: 'MRN-138491',
    phone: '(773) 555-0108',
    email: 'maria.rodriguez@example.com',
    address: '45 Sunset Blvd, Chicago, IL 60647',
    gender: 'Female',
    pronouns: 'she/her',
    photo: 'https://randomuser.me/api/portraits/women/65.jpg',
    primaryProvider: 'Dr. Sarah Reynolds',
    insurance: 'Medicare',
    pharmacy: 'Logan Square Pharmacy',
    allergies: [
      { substance: 'Sulfonamides', reaction: 'Rash', severity: 'Moderate', firstNoted: '1998-06-20' }
    ],
    conditions: [
      { name: 'Osteoarthritis, knee', code: 'M17.10', status: 'Active', onset: '2022-08-09' },
      { name: 'Gastroesophageal reflux', code: 'K21.9', status: 'Active', onset: '2018-04-17' }
    ],
    medications: [
      { name: 'Omeprazole', dose: '20 mg', frequency: 'Once daily', status: 'Active', startDate: '2018-05-01', notes: 'Before breakfast' }
    ],
    vitals: {
      bloodPressure: '132/78',
      heartRate: '72',
      temperature: '98.4',
      weight: '149',
      bmi: '25.6',
      measuredAt: '2026-06-02T11:00:00'
    },
    nextAppointment: '2026-07-18T09:00:00',
    lastVisit: '2026-06-02T11:00:00',
    alerts: [
      { severity: 'info', title: 'Mammogram due', detail: 'Screening due by September 1, 2026' }
    ],
    recentActivity: [
      { date: '2026-06-02', type: 'Office visit', detail: 'Annual wellness visit' },
      { date: '2026-06-02', type: 'Order', detail: 'Screening mammogram ordered' }
    ]
  },
  {
    name: 'Dmitri Vasilyev',
    preferredName: 'Dmitri',
    dob: '1975-09-03',
    id: 'PT92011',
    mrn: 'MRN-192011',
    phone: '(847) 555-0166',
    email: 'dmitri.vasilyev@example.com',
    address: '12 Ivanov Street, Evanston, IL 60201',
    gender: 'Male',
    pronouns: 'he/him',
    photo: 'https://randomuser.me/api/portraits/men/29.jpg',
    primaryProvider: 'Dr. Amir Patel',
    insurance: 'UnitedHealthcare',
    pharmacy: 'Evanston Family Pharmacy',
    allergies: [],
    conditions: [
      { name: 'Asthma, mild persistent', code: 'J45.30', status: 'Active', onset: '2014-01-12' }
    ],
    medications: [
      { name: 'Albuterol HFA', dose: '90 mcg', frequency: '2 puffs as needed', status: 'Active', startDate: '2014-01-12', notes: 'Rescue inhaler' }
    ],
    vitals: {
      bloodPressure: '124/80',
      heartRate: '70',
      temperature: '98.1',
      weight: '194',
      bmi: '26.3',
      measuredAt: '2026-04-28T15:45:00'
    },
    nextAppointment: '2026-09-09T15:00:00',
    lastVisit: '2026-04-28T15:45:00',
    alerts: [],
    recentActivity: [
      { date: '2026-04-28', type: 'Office visit', detail: 'Asthma follow-up' }
    ]
  },
  {
    name: 'Zhen Wei',
    preferredName: 'Zhen',
    dob: '1990-12-29',
    id: 'PT55602',
    mrn: 'MRN-155602',
    phone: '(312) 555-0111',
    email: 'zhen.wei@example.com',
    address: '88 Lotus Lane, Chicago, IL 60616',
    gender: 'Female',
    pronouns: 'she/her',
    photo: 'https://randomuser.me/api/portraits/women/22.jpg',
    primaryProvider: 'Dr. Lena Foster',
    insurance: 'Cigna Open Access',
    pharmacy: 'South Loop Pharmacy',
    allergies: [],
    conditions: [],
    medications: [],
    vitals: {
      bloodPressure: '110/72',
      heartRate: '66',
      temperature: '98.5',
      weight: '127',
      bmi: '21.8',
      measuredAt: '2026-03-12T08:30:00'
    },
    nextAppointment: '2026-10-01T08:30:00',
    lastVisit: '2026-03-12T08:30:00',
    alerts: [],
    recentActivity: [
      { date: '2026-03-12', type: 'Office visit', detail: 'Preventive wellness visit' }
    ]
  }
];

export const getAge = (dob) => {
  const birthDate = new Date(`${dob}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age;
};

export const formatDate = (date, options = {}) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options
  }).format(new Date(date));
