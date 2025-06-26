import React from 'react';

interface DuplicateImage {
  id: number;
  url: string;
}

interface DuplicateImagesGroupProps {
  images: DuplicateImage[];
}

const DuplicateImagesGroup: React.FC<DuplicateImagesGroupProps> = ({ images }) => {
  return (
    <div style={{ border: '1px solid #f99', margin: 8, padding: 8 }}>
      <h5>Duplicate Images</h5>
      <div style={{ display: 'flex', gap: 8 }}>
        {images.map(img => (
          <img key={img.id} src={img.url} alt={`Duplicate ${img.id}`} style={{ width: 80, height: 80, objectFit: 'cover' }} />
        ))}
      </div>
    </div>
  );
};

export default DuplicateImagesGroup; 