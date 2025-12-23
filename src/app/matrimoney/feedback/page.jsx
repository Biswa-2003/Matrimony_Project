
"use client";

import React, { useState } from "react";
import { Container, Row, Col, Form, Button, Alert, Card } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { FaStar } from "react-icons/fa";

export default function FeedbackPage() {
    const [coupleName, setCoupleName] = useState("");
    const [marriageDate, setMarriageDate] = useState("");
    const [story, setStory] = useState("");
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [rating, setRating] = useState(5);
    const [status, setStatus] = useState(null); // { type: 'success'|'danger', text: '' }
    const [loading, setLoading] = useState(false);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        const formData = new FormData();
        formData.append("couple_name", coupleName);
        formData.append("marriage_date", marriageDate);
        formData.append("story", story);
        formData.append("rating", rating);
        if (image) formData.append("image", image);

        try {
            const res = await fetch("/api/success-stories", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (res.ok) {
                const successMessage = image
                    ? "✅ Thank you for sharing your story! Your photo has been uploaded successfully."
                    : "✅ Thank you for sharing your story!";
                setStatus({ type: "success", text: data.message || successMessage });
                console.log('Success story submitted:', data);
                // Reset form
                setCoupleName("");
                setMarriageDate("");
                setStory("");
                setImage(null);
                setPreview(null);
                setRating(5);
            } else {
                console.error('Submission failed:', data);
                setStatus({ type: "danger", text: data.error || "Failed to submit story." });
            }
        } catch (err) {
            console.error('Submission error:', err);
            setStatus({ type: "danger", text: "Something went wrong. Please try again." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="feedback-surface py-5">
                <Container>
                    <Row className="justify-content-center">
                        <Col lg={8} md={10}>
                            <div className="text-center mb-5">
                                <h2 className="fw-bold text-maroon mb-3">Share Your Success Story</h2>
                                <p className="text-muted lead">
                                    Did you find your better half on our platform? We'd love to hear about your journey!
                                    Your story inspires others to find their soulmate.
                                </p>
                            </div>

                            <Card className="pe-card border-0 shadow-sm p-4 p-md-5">
                                <Card.Body>
                                    {status && (
                                        <Alert variant={status.type} onClose={() => setStatus(null)} dismissible className="mb-4">
                                            {status.text}
                                        </Alert>
                                    )}

                                    <Form onSubmit={handleSubmit}>
                                        <Row className="g-3 mb-4">
                                            <Col md={6}>
                                                <Form.Group>
                                                    <Form.Label className="fw-bold text-dark">Couple Name</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        placeholder="e.g. Rahul & Priya"
                                                        value={coupleName}
                                                        onChange={(e) => setCoupleName(e.target.value)}
                                                        required
                                                        className="form-control-lg fs-6"
                                                    />
                                                </Form.Group>
                                            </Col>
                                            <Col md={6}>
                                                <Form.Group>
                                                    <Form.Label className="fw-bold text-dark">Marriage Date (Optional)</Form.Label>
                                                    <Form.Control
                                                        type="date"
                                                        value={marriageDate}
                                                        onChange={(e) => setMarriageDate(e.target.value)}
                                                        className="form-control-lg fs-6"
                                                    />
                                                </Form.Group>
                                            </Col>
                                        </Row>

                                        <Form.Group className="mb-4">
                                            <Form.Label className="fw-bold text-dark">Your Story</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={5}
                                                placeholder="Tell us how you met, your first impression, and your journey together..."
                                                value={story}
                                                onChange={(e) => setStory(e.target.value)}
                                                required
                                                className="fs-6"
                                            />
                                        </Form.Group>

                                        <Form.Group className="mb-4">
                                            <Form.Label className="fw-bold text-dark">Rate Your Experience</Form.Label>
                                            <div className="d-flex align-items-center">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <FaStar
                                                        key={star}
                                                        size={32}
                                                        className="me-2"
                                                        color={star <= rating ? "#ffc107" : "#e4e5e9"}
                                                        style={{ cursor: "pointer" }}
                                                        onClick={() => setRating(star)}
                                                    />
                                                ))}
                                            </div>
                                        </Form.Group>

                                        <Form.Group className="mb-4">
                                            <Form.Label className="fw-bold text-dark">Upload Happy Photo</Form.Label>
                                            <div className="d-flex align-items-start gap-4">
                                                <div className="flex-grow-1">
                                                    <Form.Control
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleImageChange}
                                                        className="mb-2"
                                                    />
                                                    <Form.Text className="text-muted">
                                                        Share a picture of your wedding or a happy moment together.
                                                    </Form.Text>
                                                </div>
                                                {preview && (
                                                    <div className="flex-shrink-0">
                                                        <img
                                                            src={preview}
                                                            alt="Preview"
                                                            className="rounded-3 object-fit-cover border"
                                                            style={{ width: 100, height: 100 }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </Form.Group>

                                        <div className="d-grid">
                                            <Button
                                                variant="primary"
                                                type="submit"
                                                size="lg"
                                                disabled={loading}
                                                className="fw-bold"
                                                style={{ height: 50 }}
                                            >
                                                {loading ? "Submitting..." : "Submit Story"}
                                            </Button>
                                        </div>
                                    </Form>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>

            <style jsx global>{`
        .bg-pink-light { background-color: #fff0f5; }
        .text-maroon { color: #800020; }
        .pe-card { border-radius: 16px; }
        .feedback-surface { background-color: #f8f9fa; min-height: 80vh; }
        .form-control:focus {
            border-color: #E33183;
            box-shadow: 0 0 0 0.2rem rgba(227, 49, 131, 0.25);
        }
        .btn-primary {
            background-color: #E33183 !important;
            border-color: #E33183 !important;
        }
        .btn-primary:hover {
            background-color: #c21e6b !important;
            border-color: #c21e6b !important;
        }
      `}</style>
        </>
    );
}
