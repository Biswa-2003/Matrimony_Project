/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { UpdateCard } from "../UpdateCard";

// ---- mock next/navigation router ----
const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
    useRouter: () => ({ push: pushMock }),
}));

// ---- mock next/image to behave like normal img ----
jest.mock("next/image", () => {
    return function MockedImage(props) {
        // eslint-disable-next-line jsx-a11y/alt-text
        return <img {...props} />;
    };
});

// Mock resolvePhoto
jest.mock("../myhome.utils", () => ({
    resolvePhoto: jest.fn((p) => p || "/uploads/default.jpg"),
}));

import { resolvePhoto } from "../myhome.utils";

beforeEach(() => {
    pushMock.mockClear();
    resolvePhoto.mockClear();
});

const baseUser = {
    first_name: "Asha",
    matri_id: "DUM00AA88A0",
    created_at: new Date().toISOString(),
    photo: "x.jpg",
    gender: "Female",
    is_premium: false,
    connection_status: "pending",
};

describe("UpdateCard", () => {
    it("navigates to profile when card is clicked and matri_id exists", () => {
        const timeAgo = () => "1 minute ago";

        render(<UpdateCard u={baseUser} timeAgo={timeAgo} viewerIsPremium={true} />);

        // click the outer clickable area (role="button" because of the outer div)
        fireEvent.click(screen.getAllByRole("button")[0]);

        expect(pushMock).toHaveBeenCalledTimes(1);
        expect(pushMock).toHaveBeenCalledWith(
            `/matrimoney/profile-details/${encodeURIComponent(baseUser.matri_id)}`
        );
    });

    it("does NOT navigate when matri_id is missing", () => {
        render(
            <UpdateCard
                u={{ ...baseUser, matri_id: null }}
                timeAgo={() => "now"}
                viewerIsPremium={true}
            />
        );

        fireEvent.click(screen.getAllByRole("button")[0]);
        expect(pushMock).not.toHaveBeenCalled();
    });

    it("shows premium badge when target user is premium", () => {
        render(
            <UpdateCard
                u={{ ...baseUser, is_premium: true }}
                timeAgo={() => "now"}
                viewerIsPremium={true}
            />
        );

        // star icon is present inside badge
        expect(document.querySelector(".bi-star-fill")).toBeTruthy();
    });

    it("blur is applied when viewer is not premium AND target is premium AND not connected", () => {
        render(
            <UpdateCard
                u={{ ...baseUser, is_premium: true, connection_status: "pending" }}
                timeAgo={() => "now"}
                viewerIsPremium={false}
            />
        );

        const img = screen.getByAltText("User");
        expect(img.style.filter).toBe("blur(4px)");

        // When blurred, should show Upgrade link
        expect(screen.getByText("Upgrade to View")).toBeInTheDocument();
    });

    it("no blur when connected even if viewer is not premium and target is premium", () => {
        render(
            <UpdateCard
                u={{ ...baseUser, is_premium: true, connection_status: "accepted" }}
                timeAgo={() => "now"}
                viewerIsPremium={false}
            />
        );

        const img = screen.getByAltText("User");
        expect(img.style.filter).toBe("none");

        // Should show Friend button because connected
        expect(screen.getByText(/Friend/i)).toBeInTheDocument();
    });

    it("renders Connect button when not connected and not blurred", () => {
        render(
            <UpdateCard
                u={{ ...baseUser, is_premium: false, connection_status: "pending" }}
                timeAgo={() => "now"}
                viewerIsPremium={false}
            />
        );

        expect(screen.getByText("Connect")).toBeInTheDocument();
        expect(screen.getByText("View Profile")).toBeInTheDocument();
    });

    it("uses correct pronoun for Male and Female", () => {
        const { rerender } = render(
            <UpdateCard
                u={{ ...baseUser, gender: "Female" }}
                timeAgo={() => "now"}
                viewerIsPremium={true}
            />
        );
        expect(screen.getByText(/updated her profile photo/i)).toBeInTheDocument();

        rerender(
            <UpdateCard
                u={{ ...baseUser, gender: "Male" }}
                timeAgo={() => "now"}
                viewerIsPremium={true}
            />
        );
        expect(screen.getByText(/updated his profile photo/i)).toBeInTheDocument();
    });

    it("stops navigation when clicking buttons area", () => {
        render(
            <UpdateCard
                u={baseUser}
                timeAgo={() => "now"}
                viewerIsPremium={true}
            />
        );

        fireEvent.click(screen.getByText("Connect")); // inside stopPropagation div
        expect(pushMock).not.toHaveBeenCalled();
    });

    it("image onError swaps to default.jpg", () => {
        render(
            <UpdateCard
                u={{ ...baseUser, photo: "bad.jpg" }}
                timeAgo={() => "now"}
                viewerIsPremium={true}
            />
        );

        const img = screen.getByAltText("User");

        act(() => {
            fireEvent.error(img);
        });

        // after error, src becomes default (our mocked <img> keeps src attribute)
        expect(img.getAttribute("src")).toBe("/uploads/default.jpg");
    });

    it("falls back to Member when first_name is missing", () => {
        render(
            <UpdateCard
                u={{ ...baseUser, first_name: "" }}
                timeAgo={() => "now"}
                viewerIsPremium={true}
            />
        );

        expect(screen.getByText(/Member/i)).toBeInTheDocument();
    });

    it("handles hover states", () => {
        render(
            <UpdateCard u={baseUser} timeAgo={() => "now"} viewerIsPremium={true} />
        );
        const card = screen.getAllByRole("button")[0];
        fireEvent.mouseEnter(card);
        fireEvent.mouseLeave(card);
    });

    it("handles missing timeAgo", () => {
        render(
            <UpdateCard u={baseUser} timeAgo={null} viewerIsPremium={true} />
        );
        expect(screen.queryByText(/minute/i)).not.toBeInTheDocument();
    });

    it("uses 'their' for unknown gender", () => {
        render(
            <UpdateCard
                u={{ ...baseUser, gender: "Other" }}
                timeAgo={() => "now"}
                viewerIsPremium={true}
            />
        );
        expect(screen.getByText(/updated their profile photo/i)).toBeInTheDocument();
    });
});
