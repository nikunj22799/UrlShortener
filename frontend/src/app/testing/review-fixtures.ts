import {
  ProductionApplicationsPortfolio,
  ProjectStructure,
  ReviewerMetadata,
} from '../core/review/review.models';

export const REVIEW_METADATA_FIXTURE: ReviewerMetadata = {
  overview: {
    name: 'Link Operations',
    summary: 'Controlled prototype summary.',
    architecture: 'Angular, Spring Boot, and MySQL.',
    runtime: 'Java 21 and Angular 19.',
    evidenceBoundary: 'Observed evidence only.',
  },
  architecture: [{ name: 'SPA', responsibility: 'Reviewer UX.', flow: 'Browser to static JSON.' }],
  apiGroups: [{ name: 'System', endpoints: [{ method: 'GET', path: '/actuator/health', purpose: 'Health.' }] }],
  database: [{ table: 'shortened_url', purpose: 'URLs.', migration: 'V1' }],
  scenarios: [{ name: 'Greenfield', decision: 'Vertical slice.', constraints: 'Bounded.', outcome: 'Implemented.', risk: 'Approval pending.' }],
  aiTraceability: {
    accepted: ['Typed implementation.'],
    edited: ['Evidence reconciled.'],
    rejected: ['Fabricated results.'],
    excluded: ['Secrets.'],
    pendingHumanReview: ['Security decision.'],
  },
  risks: [{ id: 'RISK-014', title: 'No authentication', severity: 'CRITICAL', status: 'OPEN', mitigation: 'Controlled network.', residual: 'Public exposure blocked.' }],
  decisions: [{ id: 'ADR-006', title: 'Static metadata', status: 'ACCEPTED_DIRECTION', summary: 'Allowlist.', tradeoff: 'Not live.' }],
  approvals: [{ gate: 'Security', owner: 'Human', status: 'PENDING' }],
  limitations: ['Authentication is absent.'],
  readiness: {
    demoStatus: 'READY_FOR_DEMO',
    productionStatus: 'NOT_PRODUCTION_READY',
    environment: 'Controlled local prototype',
    version: '0.1.0',
    cache: 'DISABLED_BY_DEFAULT',
    lastValidated: '2026-08-07',
    databaseEvidence: 'Prior MySQL evidence; live details hidden.',
    functionalChecklist: [
      { item: 'Create URL', status: 'PASS', evidence: 'Tests.' },
      { item: 'Authentication', status: 'FAIL', evidence: 'Absent.' },
      { item: 'Recovery', status: 'NOT_RUN', evidence: 'Needs environment.' },
    ],
    blockers: ['Authentication is absent.'],
    nextActions: ['Complete human security review.'],
  },
  quality: {
    backend: {
      generatedAt: '2026-08-07T00:00:00Z', compile: 'PASS', unitTests: 'PASS', integrationTests: 'NOT_RUN', apiTests: 'PASS', flywayValidation: 'NOT_RUN', coverage: 'PASS', coverageLinePercent: 78.46, staticAnalysis: 'PASS', dependencyCheck: 'PASS', testCount: 140, executedTestCount: 121, skippedTestCount: 19,
    },
    frontend: {
      generatedAt: '2026-08-07T00:00:00Z', installLockfile: 'PASS', typeScript: 'PASS', lint: 'PASS', unitTests: 'PASS', coverage: 'PASS', productionBuild: 'PASS', e2eTests: 'PASS', accessibilityChecks: 'PASS', responsiveChecks: 'PASS', fullStackSmokeTest: 'PASS', unitTestCount: 83, coverageStatementsPercent: 85.62, coverageBranchesPercent: 73.89, coverageFunctionsPercent: 77.94, coverageLinesPercent: 86.61, controlledBrowserTestCount: 8, productionInitialBundleRawKb: 307.17, productionInitialBundleTransferKb: 88.3,
    },
    securityReview: { status: 'FAIL', productionFindings: 0, productionSeverity: 'INCONSISTENT', fullTreeFindings: 29, note: 'Clean install and explicit audit results contradict one another.' },
    dockerBuild: 'NOT_RUN', dockerSmoke: 'NOT_RUN', ciValidation: 'NOT_RUN', overallQuality: 'REVIEW_REQUIRED',
  },
};

export const PROJECT_STRUCTURE_FIXTURE: ProjectStructure = {
  generatedAt: '2026-08-07T00:00:00Z',
  scope: 'Allowlisted roots only.',
  exclusions: ['Secrets'],
  nodes: [{ name: 'docs', type: 'directory', children: [{ name: 'ARCHITECTURE.md', type: 'file' }] }],
};

export const EMPTY_PORTFOLIO_FIXTURE: ProductionApplicationsPortfolio = {
  status: 'REQUIRES_HUMAN_INPUT',
  message: 'No approved records.',
  applications: [],
};

export const POPULATED_PORTFOLIO_FIXTURE: ProductionApplicationsPortfolio = {
  status: 'READY',
  message: 'Synthetic test-only records; this fixture is never shipped as portfolio evidence.',
  applications: [
    {
      id: 'public-fixture', name: 'Synthetic Public Fixture', description: 'Test-only public-link record.', role: 'Test role', technologies: ['Java', 'Angular'], responsibilities: ['Exercise filtering'], outcome: 'Verifies public-link rendering.', environment: 'TEST_ONLY', confidentiality: 'Synthetic reserved-domain data.', linkVisibility: 'PUBLIC', links: [{ label: 'Synthetic public link', url: 'https://example.test/case-study' }], reviewStatus: 'TEST_FIXTURE',
    },
    {
      id: 'confidential-fixture', name: 'Synthetic Confidential Fixture', description: 'Test-only confidential-link record.', role: 'Test role', technologies: ['MySQL'], responsibilities: ['Exercise suppression'], outcome: 'Verifies confidential links remain hidden.', environment: 'TEST_ONLY', confidentiality: 'Synthetic link must not render.', linkVisibility: 'CONFIDENTIAL', links: [{ label: 'Must not render', url: 'https://confidential.example.test' }], reviewStatus: 'TEST_FIXTURE',
    },
  ],
};
