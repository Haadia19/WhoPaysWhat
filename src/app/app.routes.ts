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
    // {
    //     // path: 'project',
    //     // // component: Project #eager loading
    //     // loadComponent: () => import('./components/project/project').then(m => m.ProjectComponent),  // lazy loading        title: 'Projects'
    //     // title: titleResolver,
    // },
];
