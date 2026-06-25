import { useState } from 'react';
import { Image } from 'react-bootstrap';
import { getCategoryClass, safeImageUrl } from '../lib/foodVisuals';
import { TrackEasyIcon } from './TrackEasyIcons';

export default function FoodImage({ src, alt = 'Food', category = 'Other', className = 'food-thumb', placeholderClassName = 'food-placeholder' }) {
  const [failed, setFailed] = useState(false);
  const cleanSrc = safeImageUrl(src);
  const canShowImage = cleanSrc && !failed;
  const categoryClass = getCategoryClass(category);

  if (canShowImage) {
    return <Image src={cleanSrc} alt={alt} className={className} onError={() => setFailed(true)} />;
  }

  return (
    <div className={`${placeholderClassName} ${className} food-image-placeholder ${categoryClass}`}>
      <TrackEasyIcon name="leaf" size={34} strokeWidth={1.8} />
    </div>
  );
}
