// src/components/PhotoFilter.js
import React, { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';

const PhotoFilter = () => {
  const [filteredPhotos, setFilteredPhotos] = useState([]);
  const [groupPhotos, setGroupPhotos] = useState([]); // To hold the uploaded group photos
  const [selectedFile, setSelectedFile] = useState(null);
  const [selfieMode, setSelfieMode] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    // Load Face API models
    const loadModels = async () => {
      await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
    };
    loadModels();
  }, []);

  // Group Photo Upload Handler
  const handleGroupPhotoUpload = (event) => {
    const files = Array.from(event.target.files);
    const photoURLs = files.map(file => URL.createObjectURL(file));
    setGroupPhotos((prevPhotos) => [...prevPhotos, ...photoURLs]);
  };

  // Webcam Selfie Handler
  const startSelfie = async () => {
    setSelfieMode(true);
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      videoRef.current.srcObject = stream;
    });
  };

  const captureSelfie = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const selfieImage = canvas.toDataURL();
    handlePhotoUpload(selfieImage);
    video.srcObject.getTracks().forEach(track => track.stop()); // Stop video stream
    setSelfieMode(false);
  };

  // File Upload Handler
  const handleFileChange = (event) => {
    setSelectedFile(URL.createObjectURL(event.target.files[0]));
  };

  const handlePhotoUpload = async (imageSrc) => {
    const img = new Image();
    img.src = imageSrc;

    img.onload = async () => {
      const detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
      if (detections.length > 0) {
        console.log('Face detected!', detections);
        filterPhotosByFace(detections[0].descriptor);
      }
    };
  };

  // Filter Group Photos by Face
  const filterPhotosByFace = async (userDescriptor) => {
    const matches = [];
    for (let photoURL of groupPhotos) {
      const img = new Image();
      img.src = photoURL;
      await new Promise((resolve) => (img.onload = resolve));

      const detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
      for (let detection of detections) {
        const distance = faceapi.euclideanDistance(userDescriptor, detection.descriptor);
        if (distance < 0.6) {  // Threshold for face matching
          matches.push(photoURL);
          break;
        }
      }
    }
    setFilteredPhotos(matches);
  };

  return (
    <div>
      <h1>Photo Filter</h1>

      {/* Group Photo Upload */}
      <input type="file" accept="image/*" multiple onChange={handleGroupPhotoUpload} />
      <p>Upload group photos here. You can select multiple files.</p>

      {/* Runtime Photo Upload */}
      <input type="file" accept="image/*" onChange={handleFileChange} />
      <button onClick={() => handlePhotoUpload(selectedFile)}>Upload Photo</button>

      {/* Selfie Capture */}
      <button onClick={startSelfie}>Take a Selfie</button>

      {selfieMode && (
        <div>
          <video ref={videoRef} autoPlay width="400" height="300"></video>
          <button onClick={captureSelfie}>Capture Selfie</button>
        </div>
      )}

      {/* Canvas to capture video frame */}
      <canvas ref={canvasRef} style={{ display: 'none' }} width="400" height="300"></canvas>

      {/* Display Filtered Photos */}
      <div className="photo-gallery">
        {filteredPhotos.map((photo, index) => (
          <img key={index} src={photo} alt="Filtered group" />
        ))}
      </div>
    </div>
  );
};

export default PhotoFilter;
