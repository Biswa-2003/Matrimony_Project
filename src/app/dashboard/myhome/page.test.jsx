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
// Animated / data-heavy widgets are tested separately; keep this a fast shell test
jest.mock('@/app/components/motion', () => ({
    Reveal: ({ children, className }) => <div className={className}>{children}</div>,
    TiltCard: ({ children, className }) => <div className={className}>{children}</div>,
    AnimatedCounter: ({ to }) => <span>{to}</span>,
}));
jest.mock('../(dashboard-components)/MatchSpotlight', () => () => <div data-testid="match-spotlight">Spotlight</div>);
jest.mock('../(dashboard-components)/PendingInterests', () => () => <div data-testid="pending-interests">Pending</div>);
jest.mock('../(dashboard-components)/InboxPanel', () => () => <div data-testid="inbox-panel">Inbox</div>);
jest.mock('../(dashboard-components)/RecommendedStrip', () => () => <div data-testid="recommended-strip">Recommended</div>);
jest.mock('../(dashboard-components)/DashboardWidgets', () => ({
    ViewsChart: () => <div data-testid="views-chart" />,
    ProfileChecklist: () => <div data-testid="profile-checklist" />,
    PlanCard: () => <div data-testid="plan-card" />,
    SafetyTips: () => <div data-testid="safety-tips" />,
    SentInterestsCard: () => <div data-testid="sent-interests" />,
}));

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
        expect(screen.getByTestId('recommended-strip')).toBeInTheDocument();
        expect(screen.getByTestId('inbox-panel')).toBeInTheDocument();
        expect(screen.getByTestId('match-spotlight')).toBeInTheDocument();
    });


});
