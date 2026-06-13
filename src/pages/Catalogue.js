import React from 'react';
import Seo from '../components/Seo';

function Catalogue() {
  return (
    <div className="container mx-auto py-8">
      <Seo
        title="Catalogue"
        description="Browse Elmshelf catalogues for shelving, refrigeration, slatwall panels, bakery displays, and other retail fit-out products."
      />
      <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-4">Our Catalogue</h1>
      <p className="text-gray-700">Browse or download our product catalogues.</p>
      {/* Embed catalogue links or viewer here later */}
    </div>
  );
}

export default Catalogue;
