import {
  ChangeDetectionStrategy,
  Component,
} from '@angular/core';


import { ProjectStructureComponent } from './project-structure.component';
import { ReadmeViewerComponent } from './readme-viewer.component';


@Component({
  selector: 'app-project-review-page',
  imports: [
    ProjectStructureComponent,
    ReadmeViewerComponent,
  ],
  templateUrl: './project-review-page.component.html',
  styleUrl: './project-review-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectReviewPageComponent {}