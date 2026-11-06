export const labPanelsByPatient = {
  PT29845: [
    {
      id: 'LAB-260618-01',
      panel: 'Hemoglobin A1c',
      category: 'Diabetes',
      status: 'Final',
      orderedAt: '2026-06-15T10:20:00',
      collectedAt: '2026-06-18T08:12:00',
      resultedAt: '2026-06-18T11:42:00',
      orderingProvider: 'Dr. Sarah Reynolds',
      performingLab: 'Lakeshore Core Laboratory',
      specimen: 'Whole blood',
      reviewed: false,
      results: [
        { name: 'Hemoglobin A1c', value: 7.5, unit: '%', range: '4.0–5.6', flag: 'High', critical: false }
      ],
      trend: [
        { date: '2025-12-11', value: 6.8 },
        { date: '2026-02-19', value: 6.7 },
        { date: '2026-04-22', value: 7.0 },
        { date: '2026-06-18', value: 7.5 }
      ],
      trendLabel: 'Hemoglobin A1c',
      trendUnit: '%'
    },
    {
      id: 'LAB-260618-02',
      panel: 'Complete Blood Count',
      category: 'Hematology',
      status: 'Final',
      orderedAt: '2026-06-15T10:20:00',
      collectedAt: '2026-06-18T08:12:00',
      resultedAt: '2026-06-18T10:36:00',
      orderingProvider: 'Dr. Sarah Reynolds',
      performingLab: 'Lakeshore Core Laboratory',
      specimen: 'Whole blood',
      reviewed: true,
      results: [
        { name: 'WBC', value: 7.2, unit: '10³/µL', range: '4.0–11.0', flag: 'Normal', critical: false },
        { name: 'Hemoglobin', value: 14.2, unit: 'g/dL', range: '12.0–15.5', flag: 'Normal', critical: false },
        { name: 'Hematocrit', value: 42.7, unit: '%', range: '36.0–46.0', flag: 'Normal', critical: false },
        { name: 'Platelets', value: 256, unit: '10³/µL', range: '150–450', flag: 'Normal', critical: false }
      ]
    },
    {
      id: 'LAB-260618-03',
      panel: 'Lipid Panel',
      category: 'Cardiovascular',
      status: 'Final',
      orderedAt: '2026-06-15T10:20:00',
      collectedAt: '2026-06-18T08:12:00',
      resultedAt: '2026-06-18T10:55:00',
      orderingProvider: 'Dr. Sarah Reynolds',
      performingLab: 'Lakeshore Core Laboratory',
      specimen: 'Serum',
      reviewed: false,
      results: [
        { name: 'Total cholesterol', value: 180, unit: 'mg/dL', range: '<200', flag: 'Normal', critical: false },
        { name: 'HDL cholesterol', value: 48, unit: 'mg/dL', range: '≥50', flag: 'Low', critical: false },
        { name: 'LDL cholesterol', value: 114, unit: 'mg/dL', range: '<100', flag: 'High', critical: false },
        { name: 'Triglycerides', value: 92, unit: 'mg/dL', range: '<150', flag: 'Normal', critical: false }
      ]
    },
    {
      id: 'LAB-260624-01',
      panel: 'Basic Metabolic Panel',
      category: 'Chemistry',
      status: 'Final',
      orderedAt: '2026-06-24T08:10:00',
      collectedAt: '2026-06-24T08:48:00',
      resultedAt: '2026-06-24T09:32:00',
      orderingProvider: 'Dr. Sarah Reynolds',
      performingLab: 'Lakeshore Core Laboratory',
      specimen: 'Serum',
      reviewed: false,
      results: [
        { name: 'Glucose', value: 142, unit: 'mg/dL', range: '70–99', flag: 'High', critical: false },
        { name: 'Potassium', value: 6.2, unit: 'mmol/L', range: '3.5–5.2', flag: 'Critical high', critical: true },
        { name: 'Creatinine', value: 1.08, unit: 'mg/dL', range: '0.57–1.00', flag: 'High', critical: false }
      ]
    },
    {
      id: 'LAB-260624-02',
      panel: 'Urine Microalbumin',
      category: 'Diabetes',
      status: 'Pending',
      orderedAt: '2026-06-24T09:10:00',
      collectedAt: null,
      resultedAt: null,
      orderingProvider: 'Dr. Sarah Reynolds',
      performingLab: 'Lakeshore Core Laboratory',
      specimen: 'Urine',
      reviewed: false,
      results: []
    }
  ],
  PT00001: [
    {
      id: 'LAB-260521-01',
      panel: 'Vitamin D',
      category: 'Nutrition',
      status: 'Final',
      orderedAt: '2026-05-18T14:00:00',
      collectedAt: '2026-05-21T13:35:00',
      resultedAt: '2026-05-21T17:12:00',
      orderingProvider: 'Dr. Amir Patel',
      performingLab: 'Lakeshore Core Laboratory',
      specimen: 'Serum',
      reviewed: true,
      results: [
        { name: 'Vitamin D, 25-Hydroxy', value: 31, unit: 'ng/mL', range: '30–100', flag: 'Normal', critical: false }
      ],
      trend: [
        { date: '2025-08-14', value: 19 },
        { date: '2025-11-20', value: 24 },
        { date: '2026-02-19', value: 28 },
        { date: '2026-05-21', value: 31 }
      ],
      trendLabel: 'Vitamin D, 25-Hydroxy',
      trendUnit: 'ng/mL'
    },
    {
      id: 'LAB-260521-02',
      panel: 'Comprehensive Metabolic Panel',
      category: 'Chemistry',
      status: 'Final',
      orderedAt: '2026-05-18T14:00:00',
      collectedAt: '2026-05-21T13:35:00',
      resultedAt: '2026-05-21T16:48:00',
      orderingProvider: 'Dr. Amir Patel',
      performingLab: 'Lakeshore Core Laboratory',
      specimen: 'Serum',
      reviewed: true,
      results: [
        { name: 'Glucose', value: 91, unit: 'mg/dL', range: '70–99', flag: 'Normal', critical: false },
        { name: 'Creatinine', value: 0.88, unit: 'mg/dL', range: '0.76–1.27', flag: 'Normal', critical: false },
        { name: 'ALT', value: 24, unit: 'IU/L', range: '0–44', flag: 'Normal', critical: false }
      ]
    },
    {
      id: 'LAB-260521-03',
      panel: 'Thyroid Stimulating Hormone',
      category: 'Endocrinology',
      status: 'Final',
      orderedAt: '2026-05-18T14:00:00',
      collectedAt: '2026-05-21T13:35:00',
      resultedAt: '2026-05-21T17:05:00',
      orderingProvider: 'Dr. Amir Patel',
      performingLab: 'Lakeshore Core Laboratory',
      specimen: 'Serum',
      reviewed: true,
      results: [
        { name: 'TSH', value: 2.14, unit: 'µIU/mL', range: '0.45–4.50', flag: 'Normal', critical: false }
      ]
    }
  ],
  PT38491: [
    {
      id: 'LAB-260602-01',
      panel: 'Vitamin D',
      category: 'Bone health',
      status: 'Final',
      orderedAt: '2026-05-29T11:20:00',
      collectedAt: '2026-06-02T09:12:00',
      resultedAt: '2026-06-02T13:24:00',
      orderingProvider: 'Dr. Sarah Reynolds',
      performingLab: 'Lakeshore Core Laboratory',
      specimen: 'Serum',
      reviewed: false,
      results: [
        { name: 'Vitamin D, 25-Hydroxy', value: 26, unit: 'ng/mL', range: '30–100', flag: 'Low', critical: false }
      ],
      trend: [
        { date: '2025-06-10', value: 18 },
        { date: '2025-10-07', value: 21 },
        { date: '2026-02-03', value: 24 },
        { date: '2026-06-02', value: 26 }
      ],
      trendLabel: 'Vitamin D, 25-Hydroxy',
      trendUnit: 'ng/mL'
    },
    {
      id: 'LAB-260602-02',
      panel: 'Complete Blood Count',
      category: 'Hematology',
      status: 'Final',
      orderedAt: '2026-05-29T11:20:00',
      collectedAt: '2026-06-02T09:12:00',
      resultedAt: '2026-06-02T12:06:00',
      orderingProvider: 'Dr. Sarah Reynolds',
      performingLab: 'Lakeshore Core Laboratory',
      specimen: 'Whole blood',
      reviewed: true,
      results: [
        { name: 'WBC', value: 6.4, unit: '10³/µL', range: '3.4–10.8', flag: 'Normal', critical: false },
        { name: 'Hemoglobin', value: 12.8, unit: 'g/dL', range: '11.1–15.9', flag: 'Normal', critical: false },
        { name: 'Platelets', value: 281, unit: '10³/µL', range: '150–450', flag: 'Normal', critical: false }
      ]
    },
    {
      id: 'LAB-260602-03',
      panel: 'Comprehensive Metabolic Panel',
      category: 'Chemistry',
      status: 'Final',
      orderedAt: '2026-05-29T11:20:00',
      collectedAt: '2026-06-02T09:12:00',
      resultedAt: '2026-06-02T12:44:00',
      orderingProvider: 'Dr. Sarah Reynolds',
      performingLab: 'Lakeshore Core Laboratory',
      specimen: 'Serum',
      reviewed: true,
      results: [
        { name: 'Glucose', value: 94, unit: 'mg/dL', range: '70–99', flag: 'Normal', critical: false },
        { name: 'Calcium', value: 9.3, unit: 'mg/dL', range: '8.7–10.3', flag: 'Normal', critical: false },
        { name: 'Creatinine', value: 0.79, unit: 'mg/dL', range: '0.57–1.00', flag: 'Normal', critical: false }
      ]
    }
  ],
  PT92011: [
    {
      id: 'LAB-260428-01',
      panel: 'Absolute Eosinophil Count',
      category: 'Pulmonology',
      status: 'Final',
      orderedAt: '2026-04-25T15:30:00',
      collectedAt: '2026-04-28T14:42:00',
      resultedAt: '2026-04-28T18:20:00',
      orderingProvider: 'Dr. Amir Patel',
      performingLab: 'Lakeshore Core Laboratory',
      specimen: 'Whole blood',
      reviewed: true,
      results: [
        { name: 'Absolute eosinophils', value: 0.42, unit: '10³/µL', range: '0.00–0.40', flag: 'High', critical: false }
      ],
      trend: [
        { date: '2025-04-18', value: 0.31 },
        { date: '2025-08-22', value: 0.36 },
        { date: '2025-12-19', value: 0.39 },
        { date: '2026-04-28', value: 0.42 }
      ],
      trendLabel: 'Absolute eosinophils',
      trendUnit: '10³/µL'
    },
    {
      id: 'LAB-260428-02',
      panel: 'Complete Blood Count',
      category: 'Hematology',
      status: 'Final',
      orderedAt: '2026-04-25T15:30:00',
      collectedAt: '2026-04-28T14:42:00',
      resultedAt: '2026-04-28T17:58:00',
      orderingProvider: 'Dr. Amir Patel',
      performingLab: 'Lakeshore Core Laboratory',
      specimen: 'Whole blood',
      reviewed: true,
      results: [
        { name: 'WBC', value: 8.1, unit: '10³/µL', range: '3.4–10.8', flag: 'Normal', critical: false },
        { name: 'Hemoglobin', value: 15.1, unit: 'g/dL', range: '13.0–17.7', flag: 'Normal', critical: false },
        { name: 'Platelets', value: 238, unit: '10³/µL', range: '150–450', flag: 'Normal', critical: false }
      ]
    },
    {
      id: 'LAB-260428-03',
      panel: 'Total IgE',
      category: 'Allergy',
      status: 'Final',
      orderedAt: '2026-04-25T15:30:00',
      collectedAt: '2026-04-28T14:42:00',
      resultedAt: '2026-04-29T08:15:00',
      orderingProvider: 'Dr. Amir Patel',
      performingLab: 'Lakeshore Reference Laboratory',
      specimen: 'Serum',
      reviewed: false,
      results: [
        { name: 'Immunoglobulin E, total', value: 128, unit: 'IU/mL', range: '6–495', flag: 'Normal', critical: false }
      ]
    }
  ],
  PT55602: [
    {
      id: 'LAB-260312-01',
      panel: 'Lipid Panel',
      category: 'Preventive care',
      status: 'Final',
      orderedAt: '2026-03-09T08:00:00',
      collectedAt: '2026-03-12T07:48:00',
      resultedAt: '2026-03-12T11:35:00',
      orderingProvider: 'Dr. Lena Foster',
      performingLab: 'Lakeshore Core Laboratory',
      specimen: 'Serum',
      reviewed: true,
      results: [
        { name: 'Total cholesterol', value: 172, unit: 'mg/dL', range: '<200', flag: 'Normal', critical: false },
        { name: 'HDL cholesterol', value: 62, unit: 'mg/dL', range: '≥50', flag: 'Normal', critical: false },
        { name: 'LDL cholesterol', value: 91, unit: 'mg/dL', range: '<100', flag: 'Normal', critical: false },
        { name: 'Triglycerides', value: 104, unit: 'mg/dL', range: '<150', flag: 'Normal', critical: false }
      ],
      trend: [
        { date: '2023-03-08', value: 108 },
        { date: '2024-03-11', value: 102 },
        { date: '2025-03-10', value: 96 },
        { date: '2026-03-12', value: 91 }
      ],
      trendLabel: 'LDL cholesterol',
      trendUnit: 'mg/dL'
    },
    {
      id: 'LAB-260312-02',
      panel: 'Comprehensive Metabolic Panel',
      category: 'Chemistry',
      status: 'Final',
      orderedAt: '2026-03-09T08:00:00',
      collectedAt: '2026-03-12T07:48:00',
      resultedAt: '2026-03-12T11:20:00',
      orderingProvider: 'Dr. Lena Foster',
      performingLab: 'Lakeshore Core Laboratory',
      specimen: 'Serum',
      reviewed: true,
      results: [
        { name: 'Glucose', value: 88, unit: 'mg/dL', range: '70–99', flag: 'Normal', critical: false },
        { name: 'Creatinine', value: 0.72, unit: 'mg/dL', range: '0.57–1.00', flag: 'Normal', critical: false },
        { name: 'ALT', value: 16, unit: 'IU/L', range: '0–32', flag: 'Normal', critical: false }
      ]
    },
    {
      id: 'LAB-260312-03',
      panel: 'Thyroid Stimulating Hormone',
      category: 'Endocrinology',
      status: 'Final',
      orderedAt: '2026-03-09T08:00:00',
      collectedAt: '2026-03-12T07:48:00',
      resultedAt: '2026-03-12T11:44:00',
      orderingProvider: 'Dr. Lena Foster',
      performingLab: 'Lakeshore Core Laboratory',
      specimen: 'Serum',
      reviewed: true,
      results: [
        { name: 'TSH', value: 1.86, unit: 'µIU/mL', range: '0.45–4.50', flag: 'Normal', critical: false }
      ]
    }
  ]
};

export const defaultLabPanels = [
  {
    id: 'LAB-GENERIC-01',
    panel: 'Comprehensive Metabolic Panel',
    category: 'Chemistry',
    status: 'Final',
    orderedAt: '2026-05-12T09:00:00',
    collectedAt: '2026-05-14T08:30:00',
    resultedAt: '2026-05-14T12:10:00',
    orderingProvider: 'Dr. Sarah Reynolds',
    performingLab: 'Lakeshore Core Laboratory',
    specimen: 'Serum',
    reviewed: true,
    results: [
      { name: 'Glucose', value: 96, unit: 'mg/dL', range: '70–99', flag: 'Normal', critical: false },
      { name: 'Creatinine', value: 0.92, unit: 'mg/dL', range: '0.57–1.00', flag: 'Normal', critical: false },
      { name: 'Sodium', value: 140, unit: 'mmol/L', range: '134–144', flag: 'Normal', critical: false }
    ]
  }
];

export const availableLabOrders = [
  'Basic Metabolic Panel',
  'Complete Blood Count',
  'Comprehensive Metabolic Panel',
  'Hemoglobin A1c',
  'Lipid Panel',
  'Thyroid Stimulating Hormone',
  'Urinalysis'
];
