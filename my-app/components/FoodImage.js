import { useEffect, useState } from 'react';
import { Image } from 'react-bootstrap';
import { getCategoryClass, getFoodImage } from '../lib/foodVisuals';
import { TrackEasyIcon } from './TrackEasyIcons';

export default function FoodImage({ src, alt = 'Food', category = 'Other', variant = 'compact', className = 'food-thumb', placeholderClassName = 'food-placeholder' }) {
  const [failed, setFailed] = useState(false);
  const cleanSrc = getFoodImage(src);
  const canShowImage = cleanSrc && !failed;
  const categoryClass = getCategoryClass(category);

  useEffect(() => setFailed(false), [cleanSrc]);

  if (canShowImage) {
    return <Image src={cleanSrc} alt={alt} className={`food-image food-image--${variant} ${className}`.trim()} onError={() => setFailed(true)} />;
  }

  return (
    <div className={`${placeholderClassName} ${className} food-image food-image--${variant} food-image-placeholder ${categoryClass}`}>
      <TrackEasyIcon name="leaf" size={34} strokeWidth={1.8} />
    </div>
  );
}
