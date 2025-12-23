'use client';

import React from 'react';
import { Modal, Button, Image } from 'react-bootstrap';

export default function ProfilePhotoModal({ show, onHide, reload }) {
  const [photos, setPhotos] = React.useState([]);

  React.useEffect(() => {
    if (show) {
      fetchPhotos();
    }
  }, [show]);

  const fetchPhotos = async () => {
    try {
      const res = await fetch('/api/my-home');
      const data = await res.json();
      if (Array.isArray(data.profile?.photo)) {
        setPhotos(data.profile.photo);
      }
    } catch (err) {
      console.error('Failed to fetch photos', err);
    }
  };

  const handleDelete = async (photo) => {
    const confirm = window.confirm('Are you sure you want to delete this photo?');
    if (!confirm) return;

    try {
      const res = await fetch('/api/delete-photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photo }),
      });

      const result = await res.json();
      alert(result.message);

      if (res.ok) {
        await fetchPhotos();
        reload(); // refresh main profile image
      }
    } catch (err) {
      console.error('Failed to delete photo', err);
      alert('Delete failed');
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Uploaded Profile Photos</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {photos.length === 0 ? (
          <p>No photos uploaded yet.</p>
        ) : (
          <div className="row">
            {photos.map((photo, idx) => (
              <div key={idx} className="col-6 col-md-4 mb-3 text-center">
                <Image
                  src={photo.startsWith('/') ? photo : `/uploads/${photo}`}
                  alt={`Photo ${idx + 1}`}
                  fluid
                  rounded
                  className="mb-2"
                  style={{ maxHeight: '200px', objectFit: 'cover' }}
                />
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(photo)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
