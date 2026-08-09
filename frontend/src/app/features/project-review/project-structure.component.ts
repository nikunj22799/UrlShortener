import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';

interface ProjectNode {
  readonly name: string;
  readonly type: 'directory' | 'file';
  readonly children?: readonly ProjectNode[];
}

interface ProjectStructure {
  readonly generatedAt?: string;
  readonly scope?: string;
  readonly exclusions?: readonly string[];
  readonly nodes: readonly ProjectNode[];
}

interface VisibleProjectNode extends ProjectNode {
  readonly path: string;
  readonly level: number;
}

@Component({
  selector: 'app-project-structure',
  imports: [],
  templateUrl: './project-structure.component.html',
  styleUrl: './project-structure.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectStructureComponent {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  private readonly expandedPaths = signal<ReadonlySet<string>>(
    new Set(),
  );

  protected readonly structure =
    signal<ProjectStructure | null>(null);

  protected readonly loading = signal(true);
  protected readonly loadFailed = signal(false);

  protected readonly visibleNodes = computed(() =>
    flattenVisibleNodes(
      this.structure()?.nodes ?? [],
      this.expandedPaths(),
    ),
  );

  constructor() {
    this.loadStructure();
  }

  protected loadStructure(): void {
    this.loading.set(true);
    this.loadFailed.set(false);

    this.http
      .get<ProjectStructure>(
        '/assets/engineering/project-structure.json',
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (structure) => {
          this.structure.set(structure);

          this.expandedPaths.set(
            initialExpandedPaths(structure.nodes),
          );

          this.loading.set(false);
        },
        error: () => {
          this.structure.set(null);
          this.loadFailed.set(true);
          this.loading.set(false);
        },
      });
  }

  protected toggleNode(node: VisibleProjectNode): void {
    if (node.type !== 'directory') {
      return;
    }

    const next = new Set(this.expandedPaths());

    if (next.has(node.path)) {
      next.delete(node.path);
    } else {
      next.add(node.path);
    }

    this.expandedPaths.set(next);
  }

  protected isExpanded(path: string): boolean {
    return this.expandedPaths().has(path);
  }
}

function initialExpandedPaths(
  nodes: readonly ProjectNode[],
): ReadonlySet<string> {
  return new Set(
    nodes
      .filter((node) => node.type === 'directory')
      .map((node) => node.name),
  );
}

function flattenVisibleNodes(
  nodes: readonly ProjectNode[],
  expandedPaths: ReadonlySet<string>,
  parentPath = '',
  level = 0,
): readonly VisibleProjectNode[] {
  const visible: VisibleProjectNode[] = [];

  for (const node of nodes) {
    const path = parentPath
      ? `${parentPath}/${node.name}`
      : node.name;

    visible.push({
      ...node,
      path,
      level,
    });

    if (
      node.type === 'directory' &&
      node.children &&
      expandedPaths.has(path)
    ) {
      visible.push(
        ...flattenVisibleNodes(
          node.children,
          expandedPaths,
          path,
          level + 1,
        ),
      );
    }
  }

  return visible;
}