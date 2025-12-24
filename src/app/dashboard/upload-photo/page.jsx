'use client';

import React, { useState } from 'react';
import { Container, Form, Button, Alert, Card } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function UploadPhotoPage() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState(null);

    const handleFileChange = (e) => {
        setSelectedFile(e.target.files[0]);
        setMessage(null);
    };

    const handleUpload = async (e) => {
        e.preventDefault();

        if (!selectedFile) {
            setMessage({ type: 'danger', text: 'Please select a photo first' });
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('photo', selectedFile);

        try {
            const res = await fetch('/api/upload-photo', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: data.message || 'Photo uploaded successfully!' });
                setSelectedFile(null);
            } else {
                setMessage({ type: 'danger', text: data.error || 'Upload failed' });
            }
        } catch (error) {
            setMessage({ type: 'danger', text: 'Network error. Please try again.' });
        } finally {
            setUploading(false);
        }
    };

    return (
        <Container className="py-5">
            <Card className="shadow-sm">
                <Card.Body className="p-4">
                    <h3 className="mb-4">Upload Profile Photo</h3>

                    {message && (
                        <Alert variant={message.type} dismissible onClose={() => setMessage(null)}>
                            {message.text}
                        </Alert>
                    )}

                    <Form onSubmit={handleUpload}>
                        <Form.Group className="mb-3">
                            <Form.Label>Select Photo</Form.Label>
                            <Form.Control
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                disabled={uploading}
                            />
                            <Form.Text className="text-muted">
                                Accepted formats: JPG, PNG, GIF. Max size: 5MB
                            </Form.Text>
                        </Form.Group>

                        <Button
                            variant="primary"
                            type="submit"
                            disabled={uploading || !selectedFile}
                        >
                            {uploading ? 'Uploading...' : 'Upload Photo'}
                        </Button>
                    </Form>
                </Card.Body>
            </Card>
        </Container>
    );
}
