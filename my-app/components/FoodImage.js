import { useState } from 'react';
import { Image } from 'react-bootstrap';
import { getCategoryClass, getCategoryIcon, safeImageUrl } from '../lib/foodVisuals';

export default function FoodImage({ src, alt = 'Food', category = 'Other', className = 'food-thumb', placeholderClassName = 'food-placeholder' }) {
  const [failed, setFailed] = useState(false);
  const cleanSrc = safeImageUrl(src);
  const canShowImage = cleanSrc && !failed;
  const categoryClass = getCategoryClass(category);

  if (canShowImage) {
    return <Image src={cleanSrc} alt={alt} className={className} onError={() => setFailed(true)} />;
  }

  return (
    <div className={`${placeholderClassName} ${className} emoji-placeholder ${categoryClass}`}>
      {getCategoryIcon(category)}
    </div>
  );
}
