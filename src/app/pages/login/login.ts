import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-login',
    imports: [CommonModule, FormsModule],
    templateUrl: './login.html',
    styleUrl: './login.css',
})
export class LoginComponent {
    constructor(
        private authService: AuthService,
        private router: Router
    ) { }

    // Form state
    isLoginMode = true;
    email = '';
    password = '';
    confirmPassword = '';

    // UI state
    loading = false;
    error?: string;
    successMessage?: string;

    toggleMode() {
        this.isLoginMode = !this.isLoginMode;
        this.error = undefined;
        this.successMessage = undefined;
    }

    async onSubmit() {
        this.error = undefined;
        this.successMessage = undefined;

        if (!this.email || !this.password) {
            this.error = 'Please fill in all fields';
            return;
        }

        if (!this.isLoginMode && this.password !== this.confirmPassword) {
            this.error = 'Passwords do not match';
            return;
        }

        this.loading = true;

        if (this.isLoginMode) {
            const { error } = await this.authService.signIn(this.email, this.password);
            if (error) {
                this.error = error.message;
            } else {
                this.router.navigate(['/bill']);
            }
        } else {
            const { error } = await this.authService.signUp(this.email, this.password);
            if (error) {
                this.error = error.message;
            } else {
                this.successMessage = 'Account created! Please check your email to confirm your account.';
                this.isLoginMode = true;
            }
        }

        this.loading = false;
    }

    async forgotPassword() {
        if (!this.email) {
            this.error = 'Please enter your email address';
            return;
        }

        this.loading = true;
        const { error } = await this.authService.resetPassword(this.email);

        if (error) {
            this.error = error.message;
        } else {
            this.successMessage = 'Password reset email sent! Check your inbox.';
        }

        this.loading = false;
    }
}
