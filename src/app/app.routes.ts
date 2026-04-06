import { ResolveFn, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';

const titleResolver: ResolveFn<string> = (route) => {
    const id = route.params['id'];
    return id ? `Project #${id}` : 'Project';
};
export const routes: Routes = [
    {
        path: '',
        component: HomeComponent,
        title: titleResolver,
    },
    {
        path: 'login',
        loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent),
        title: 'Login',
    },
    {
        path: 'bill',
        loadComponent: () => import('./pages/bills/bills').then(m => m.BillsComponent),  // lazy loading
        title: 'My Bills',
    },
    {
        path: 'bill/:id',
        loadComponent: () => import('./pages/bill-detail/bill-detail').then(m => m.BillDetailComponent),
        title: 'Bill Details',
    },
];
