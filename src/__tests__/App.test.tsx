import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

// Minimal smoke test - adjust import path to main app component if different
import App from '../App';

test('renders app without crashing', () => {
    const { container } = render(<App />);
    const el = container.querySelector('.App');
    expect(el).toBeTruthy();
});

test('accessibility checks with jest-axe', async () => {
    const { container } = render(<App />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
});
