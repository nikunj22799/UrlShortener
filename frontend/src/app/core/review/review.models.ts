export type EvidenceStatus = 'PASS' | 'FAIL' | 'NOT_RUN' | 'N/A';

export interface ArchitectureItem {
  readonly name: string;
  readonly responsibility: string;
  readonly flow: string;
}

export interface ApiEndpointItem {
  readonly method: string;
  readonly path: string;
  readonly purpose: string;
}

export interface ApiGroupItem {
  readonly name: string;
  readonly endpoints: readonly ApiEndpointItem[];
}

export interface DatabaseItem {
  readonly table: string;
  readonly purpose: string;
  readonly migration: string;
}

export interface ScenarioItem {
  readonly name: string;
  readonly decision: string;
  readonly constraints: string;
  readonly outcome: string;
  readonly risk: string;
}

export interface RiskItem {
  readonly id: string;
  readonly title: string;
  readonly severity: string;
  readonly status: string;
  readonly mitigation: string;
  readonly residual: string;
}

export interface DecisionItem {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly summary: string;
  readonly tradeoff: string;
}

export interface ApprovalItem {
  readonly gate: string;
  readonly owner: string;
  readonly status: string;
}

export interface FunctionalChecklistItem {
  readonly item: string;
  readonly status: EvidenceStatus;
  readonly evidence: string;
}

export interface BackendQuality {
  readonly generatedAt: string;
  readonly compile: EvidenceStatus;
  readonly unitTests: EvidenceStatus;
  readonly integrationTests: EvidenceStatus;
  readonly apiTests: EvidenceStatus;
  readonly flywayValidation: EvidenceStatus;
  readonly coverage: EvidenceStatus;
  readonly coverageLinePercent: number;
  readonly staticAnalysis: EvidenceStatus;
  readonly dependencyCheck: EvidenceStatus;
  readonly testCount: number;
  readonly executedTestCount: number;
  readonly skippedTestCount: number;
}

export interface FrontendQuality {
  readonly generatedAt: string;
  readonly installLockfile: EvidenceStatus;
  readonly typeScript: EvidenceStatus;
  readonly lint: EvidenceStatus;
  readonly unitTests: EvidenceStatus;
  readonly coverage: EvidenceStatus;
  readonly productionBuild: EvidenceStatus;
  readonly e2eTests: EvidenceStatus;
  readonly accessibilityChecks: EvidenceStatus;
  readonly responsiveChecks: EvidenceStatus;
  readonly fullStackSmokeTest: EvidenceStatus;
  readonly unitTestCount: number;
  readonly coverageStatementsPercent: number;
  readonly coverageBranchesPercent: number;
  readonly coverageFunctionsPercent: number;
  readonly coverageLinesPercent: number;
  readonly controlledBrowserTestCount: number;
  readonly productionInitialBundleRawKb: number;
  readonly productionInitialBundleTransferKb: number;
}

export interface ReviewerMetadata {
  readonly overview: {
    readonly name: string;
    readonly summary: string;
    readonly architecture: string;
    readonly runtime: string;
    readonly evidenceBoundary: string;
  };
  readonly architecture: readonly ArchitectureItem[];
  readonly apiGroups: readonly ApiGroupItem[];
  readonly database: readonly DatabaseItem[];
  readonly scenarios: readonly ScenarioItem[];
  readonly aiTraceability: {
    readonly accepted: readonly string[];
    readonly edited: readonly string[];
    readonly rejected: readonly string[];
    readonly excluded: readonly string[];
    readonly pendingHumanReview: readonly string[];
  };
  readonly risks: readonly RiskItem[];
  readonly decisions: readonly DecisionItem[];
  readonly approvals: readonly ApprovalItem[];
  readonly limitations: readonly string[];
  readonly readiness: {
    readonly demoStatus: string;
    readonly productionStatus: string;
    readonly environment: string;
    readonly version: string;
    readonly cache: string;
    readonly lastValidated: string;
    readonly databaseEvidence: string;
    readonly functionalChecklist: readonly FunctionalChecklistItem[];
    readonly blockers: readonly string[];
    readonly nextActions: readonly string[];
  };
  readonly quality: {
    readonly backend: BackendQuality;
    readonly frontend: FrontendQuality;
    readonly securityReview: {
      readonly status: EvidenceStatus;
      readonly productionFindings: number;
      readonly productionSeverity: string;
      readonly fullTreeFindings: number;
      readonly note: string;
    };
    readonly dockerBuild: EvidenceStatus;
    readonly dockerSmoke: EvidenceStatus;
    readonly ciValidation: EvidenceStatus;
    readonly overallQuality: string;
  };
}

export interface ProjectNode {
  readonly name: string;
  readonly type: 'directory' | 'file';
  readonly children?: readonly ProjectNode[];
}

export interface ProjectStructure {
  readonly generatedAt: string;
  readonly scope: string;
  readonly exclusions: readonly string[];
  readonly nodes: readonly ProjectNode[];
}

export interface VisibleProjectNode extends ProjectNode {
  readonly path: string;
  readonly level: number;
}

export interface BackendHealth {
  readonly status: string;
}

export type PortfolioStatus = 'REQUIRES_HUMAN_INPUT' | 'READY';
export type LinkVisibility = 'PUBLIC' | 'CONFIDENTIAL';

export interface ProductionApplication {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly role: string;
  readonly technologies: readonly string[];
  readonly responsibilities: readonly string[];
  readonly outcome: string;
  readonly environment: string;
  readonly confidentiality: string;
  readonly links?: readonly { readonly label: string; readonly url: string }[];
  readonly linkVisibility: LinkVisibility;
  readonly reviewStatus: string;
}

export interface ProductionApplicationsPortfolio {
  readonly status: PortfolioStatus;
  readonly message: string;
  readonly applications: readonly ProductionApplication[];
}
