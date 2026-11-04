import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthStore, ForemanStore } from './api';
import { PersonalSessionStore } from './session';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  const admin = inject(AuthStore);
  const personal = inject(PersonalSessionStore);
  const legacy = inject(ForemanStore);
  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        request.headers.has('Authorization')
      ) {
        if (request.url.includes('/api/member/password')) {
          // La clave actual puede ser incorrecta sin que la sesión haya vencido.
        } else if (request.url.includes('/api/member/') || request.url.includes('/api/auth/personal/')) {
          personal.clear();
          void router.navigateByUrl('/login');
        } else if (request.url.includes('/api/public/session/')) {
          legacy.clear();
          void router.navigateByUrl('/capataz');
        } else if (request.url.includes('/api/admin/')) {
          admin.clear();
          void router.navigateByUrl('/login');
        }
      }
      return throwError(() => error);
    }),
  );
};

