import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'dashboard',
    title: 'Dashboard | URL Shortener',
    loadComponent: () =>
      import(
        './features/dashboard/dashboard-page.component'
      ).then(
        (module) =>
          module.DashboardPageComponent,
      ),
  },
  {
    path: 'urls/new',
    title: 'Create URL | URL Shortener',
    loadComponent: () =>
      import(
        './features/create-url/create-url-page.component'
      ).then(
        (module) =>
          module.CreateUrlPageComponent,
      ),
  },
  {
    path: 'urls',
    title: 'URL Management | URL Shortener',
    loadComponent: () =>
      import(
        './features/url-management/url-management-page.component'
      ).then(
        (module) =>
          module.UrlManagementPageComponent,
      ),
  },
  {
    path: 'urls/:id/analytics',
    title: 'URL Analytics | URL Shortener',
    loadComponent: () =>
      import(
        './features/analytics/analytics-page.component'
      ).then(
        (module) =>
          module.AnalyticsPageComponent,
      ),
  },
  {
    path: 'urls/:id',
    title: 'URL Details | URL Shortener',
    loadComponent: () =>
      import(
        './features/url-management/url-details-page.component'
      ).then(
        (module) =>
          module.UrlDetailsPageComponent,
      ),
  },
  {
    path: 'analytics',
    title: 'Analytics | URL Shortener',
    loadComponent: () =>
      import(
        './features/analytics/analytics-page.component'
      ).then(
        (module) =>
          module.AnalyticsPageComponent,
      ),
  },
  {
    path: 'project-review',
    title: 'Project Review | URL Shortener',
    loadComponent: () =>
      import(
        './features/project-review/project-review-page.component'
      ).then(
        (module) =>
          module.ProjectReviewPageComponent,
      ),
  },
  {
    path: '**',
    title: 'Page Not Found | URL Shortener',
    loadComponent: () =>
      import(
        './shared/components/not-found-page.component'
      ).then(
        (module) =>
          module.NotFoundPageComponent,
      ),
  },
];