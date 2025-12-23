/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import MyHome from './page';
import { useInterestStats } from '@/app/hooks/useInterestStats';

// Mock mocks
jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('next/link', () => {
    return ({ children, href }) => <a href={href}>{children}</a>;
});

jest.mock('next/image', () => {
    return ({ src, alt, ...props }) => <img src={src} alt={alt} {...props} />;
});

// Mock child components
jest.mock('../(dashboard-components)/DailyCarousel', () => () => <div data-testid="daily-carousel">Carousel</div>);
jest.mock('@/app/components/ImageCropper', () => () => <div data-testid="image-cropper">Cropper</div>);
jest.mock('../(dashboard-components)/ProfilePhotoModal', () => () => <div data-testid="photo-modal">PhotoModal</div>);
jest.mock('../(dashboard-components)/SuccessModal', () => () => <div data-testid="success-modal">SuccessModal</div>);
jest.mock('@/app/dashboard/(dashboard-components)/ProfileCompletionBar', () => () => <div data-testid="completion-bar">Bar</div>);

// Mock Hook
jest.mock('@/app/hooks/useInterestStats', () => ({
    useInterestStats: jest.fn(),
}));

// Mock URL API
global.URL.createObjectURL = jest.fn(() => 'blob:test');
global.URL.revokeObjectURL = jest.fn();

// Mock Fetch
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({})),
        json: () => Promise.resolve({}),
    })
);

describe('MyHome Component', () => {
    beforeEach(() => {
        useInterestStats.mockReturnValue({
            stats: { received: 0, accepted: 0, viewed: 0 },
            loading: false,
            error: null,
        });
        fetch.mockClear();
    });

    it('renders successfully', async () => {
        render(<MyHome />);

        // Check for static text to confirm render
        expect(screen.getByText((content) => content.includes('Welcome back'))).toBeInTheDocument();

        // Check if child components are rendered
        expect(screen.getByTestId('daily-carousel')).toBeInTheDocument();
    });


});
