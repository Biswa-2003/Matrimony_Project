'use client';
import Cropper from 'react-easy-crop';
import { useCallback, useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import getCroppedImg from './cropImageUtil';

export default function ImageCropper({ image, show, onClose, onCropDone }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((_, areaPixels) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleCrop = async () => {
    const croppedBlob = await getCroppedImg(image, croppedAreaPixels);
    const file = new File([croppedBlob], 'cropped.jpg', { type: 'image/jpeg' });
    onCropDone(file); // Pass file to parent
  };

  return (
    <Modal show={show} onHide={onClose} size="lg" centered>
      <Modal.Body style={{ height: 400 }}>
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={3 / 4}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleCrop}>Crop & Upload</Button>
      </Modal.Footer>
    </Modal>
  );
}
