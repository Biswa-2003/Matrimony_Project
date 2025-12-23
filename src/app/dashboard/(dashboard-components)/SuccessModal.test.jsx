/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SuccessModal from './SuccessModal';

describe('SuccessModal', () => {
    it('renders nothing when show is false', () => {
        const { container } = render(<SuccessModal show={false} message="Test" onClose={() => { }} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders correctly when show is true', () => {
        render(<SuccessModal show={true} message="Operation Successful" onClose={() => { }} />);

        // Check for success message
        expect(screen.getByText('Operation Successful')).toBeInTheDocument();

        // Check for "Success!" title
        expect(screen.getByText('Success!')).toBeInTheDocument();

        // Check if close button is present
        expect(screen.getByText('Awesome')).toBeInTheDocument();
    });

    it('calls onClose when button is clicked', () => {
        const handleClose = jest.fn();
        render(<SuccessModal show={true} message="Done" onClose={handleClose} />);

        const button = screen.getByText('Awesome');
        fireEvent.click(button);

        expect(handleClose).toHaveBeenCalledTimes(1);
    });
});
