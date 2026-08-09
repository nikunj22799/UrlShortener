import { routes } from './app.routes';

describe('application routes', () => {
  it('exposes the expected application routes', () => {
    expect(
      routes.map((route) => route.path),
    ).toEqual([
      '',
      'dashboard',
      'urls/new',
      'urls',
      'urls/:id/analytics',
      'urls/:id',
      'analytics',
      'project-review',
      '**',
    ]);
  });

  it('redirects the root route to dashboard', () => {
    const rootRoute = routes[0];

    expect(rootRoute.path).toBe('');
    expect(rootRoute.redirectTo).toBe(
      'dashboard',
    );
    expect(rootRoute.pathMatch).toBe(
      'full',
    );
  });

  it('keeps URL analytics before the parameterized details route', () => {
    const paths = routes.map(
      (route) => route.path,
    );

    expect(
      paths.indexOf('urls/:id/analytics'),
    ).toBeLessThan(
      paths.indexOf('urls/:id'),
    );
  });

  it('exposes the consolidated project review route', () => {
    const paths = routes.map(
      (route) => route.path,
    );

    expect(paths).toContain(
      'project-review',
    );

    expect(paths).not.toContain(
      'engineering-review',
    );

    expect(paths).not.toContain(
      'production-readiness',
    );

    expect(paths).not.toContain(
      'production-applications',
    );
  });

  it('does not expose deferred authentication or admin routes', () => {
    const paths = routes.map(
      (route) => route.path,
    );

    expect(paths).not.toContain('login');
    expect(paths).not.toContain('users');
    expect(paths).not.toContain('admin');
    expect(paths).not.toContain(
      'operations',
    );
  });

  it('keeps the wildcard route last', () => {
    expect(
      routes.at(-1)?.path,
    ).toBe('**');
  });
});