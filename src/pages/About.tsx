import React from 'react';
import { Factory, Users, Award, Target, Package, Zap } from 'lucide-react';

const About = () => {
  const rawMaterials = [
    { name: 'Iron Ore', description: 'High-grade iron ore for steel production', icon: <Package className="h-6 w-6" /> },
    { name: 'Coal', description: 'Coking coal for blast furnace operations', icon: <Zap className="h-6 w-6" /> },
    { name: 'Limestone', description: 'Flux material for steel making process', icon: <Package className="h-6 w-6" /> },
    { name: 'Dolomite', description: 'Refractory material for furnace lining', icon: <Package className="h-6 w-6" /> },
  ];

  const steelProducts = [
    { name: 'Hot Rolled Coils', description: 'High-quality hot rolled steel coils', icon: <Factory className="h-6 w-6" /> },
    { name: 'Cold Rolled Sheets', description: 'Precision cold rolled steel sheets', icon: <Factory className="h-6 w-6" /> },
    { name: 'Wire Rods', description: 'Steel wire rods for various applications', icon: <Factory className="h-6 w-6" /> },
    { name: 'Structural Steel', description: 'Beams, angles, and channels', icon: <Factory className="h-6 w-6" /> },
    { name: 'Plates', description: 'Heavy steel plates for construction', icon: <Factory className="h-6 w-6" /> },
    { name: 'Pipes & Tubes', description: 'Seamless and welded steel pipes', icon: <Factory className="h-6 w-6" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-slate-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">About RINL</h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Rashtriya Ispat Nigam Limited - Leading India's steel industry with innovative technology, 
            sustainable practices, and unwavering commitment to excellence since 1982.
          </p>
        </div>
      </section>

      {/* Company Overview */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
              <p className="text-gray-600 mb-6">
                Established in 1982, Rashtriya Ispat Nigam Limited (RINL) is India's premier 
                steel manufacturing company. Located in Visakhapatnam, Andhra Pradesh, we have 
                grown to become one of the country's most trusted names in steel production.
              </p>
              <p className="text-gray-600">
                Today, we operate state-of-the-art facilities that produce over 7.3 million 
                tons of high-quality steel annually, serving industries ranging from 
                construction and automotive to shipbuilding and infrastructure development.
              </p>
            </div>
            <div>
              <img
                src="https://resize.indiatvnews.com/en/resize/newbucket/1200_-/2021/03/vizagsteel-1615259124.jpg"
                alt="RINL Steel Manufacturing"
                className="rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Raw Materials Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Raw Materials</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              High-quality raw materials that form the foundation of our steel production process
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {rawMaterials.map((material, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-6 text-center hover:shadow-lg transition-shadow duration-200">
                <div className="flex justify-center mb-4 text-teal-500">
                  {material.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{material.name}</h3>
                <p className="text-gray-600 text-sm">{material.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steel Products Section */}
      <section className="py-16 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Steel Products</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Comprehensive range of steel products manufactured to meet diverse industry requirements
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {steelProducts.map((product, index) => (
              <div key={index} className="bg-white rounded-lg p-6 hover:shadow-lg transition-shadow duration-200">
                <div className="flex items-center mb-4">
                  <div className="text-teal-500 mr-3">
                    {product.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                </div>
                <p className="text-gray-600">{product.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Values</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              The principles that guide everything we do and shape our company culture
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <Factory className="h-12 w-12 text-teal-500" />,
                title: 'Innovation',
                description: 'Continuously advancing steel production technology and processes'
              },
              {
                icon: <Users className="h-12 w-12 text-blue-500" />,
                title: 'People First',
                description: 'Prioritizing safety, development, and well-being of our workforce'
              },
              {
                icon: <Award className="h-12 w-12 text-green-500" />,
                title: 'Quality',
                description: 'Delivering products that exceed industry standards and expectations'
              },
              {
                icon: <Target className="h-12 w-12 text-purple-500" />,
                title: 'Sustainability',
                description: 'Committed to environmental responsibility and sustainable practices'
              }
            ].map((value, index) => (
              <div key={index} className="text-center p-6 rounded-lg bg-gray-50 hover:shadow-lg transition-shadow duration-200">
                <div className="flex justify-center mb-4">
                  {value.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{value.title}</h3>
                <p className="text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership Section */}
      <section className="py-16 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Leadership Team</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Experienced professionals driving our vision forward
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Atul Bhatt',
                position: 'Chairman & Managing Director',
                image: 'https://images.pexedls.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop'
              },
              {
                name: 'P.K. Rath',
                position: 'Director (Operations)',
                image: 'https://images.pexdels.com/photos/937481/pexels-photo-937481.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop'
              },
              {
                name: 'K. Rajeev Kumar',
                position: 'Director (Finance)',
                image: 'https://images.pexelss.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop'
              }
            ].map((leader, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                <img
                  src={leader.image}
                  alt={leader.name}
                  className="w-full h-64 object-cover"
                />
                <div className="p-6 text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{leader.name}</h3>
                  <p className="text-gray-600">{leader.position}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;