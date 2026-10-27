import React from 'react';
import Carousel from '../components/Carousel';
import Counter from '../components/Counter';
import { Factory, Flame, Users, Award, Phone, Mail } from 'lucide-react';

const Home = () => {
  const stats = [
    {
      icon: <Factory className="h-8 w-8 text-teal-500" />,
      label: 'Daily Steel Production',
      value: 2500,
      suffix: ' tons'
    },
    {
      icon: <Flame className="h-8 w-8 text-red-500" />,
      label: 'Molten Iron Output',
      value: 1800,
      suffix: ' tons'
    },
    {
      icon: <Users className="h-8 w-8 text-blue-500" />,
      label: 'Active Employees',
      value: 850,
      suffix: ''
    },
    {
      icon: <Award className="h-8 w-8 text-green-500" />,
      label: 'Quality Standards Met',
      value: 99,
      suffix: '%'
    }
  ];

  const partners = [
    {
      name: 'Industrial Steel Corp',
      image: 'https://images.pexels.com/photos/1108101/pexels-photo-1108101.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
      contact: '+1 (555) 123-4567'
    },
    {
      name: 'MetalWorks International',
      image: 'https://images.pexels.com/photos/1108630/pexels-photo-1108630.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
      contact: '+1 (555) 987-6543'
    },
    {
      name: 'Steel Dynamics Ltd',
      image: 'https://images.pexels.com/photos/162568/steel-mill-factory-industry-162568.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
      contact: '+1 (555) 456-7890'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Carousel Section */}
      <Carousel />

      {/* Statistics Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Daily Production Overview</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Real-time insights into our steel production capabilities and operational excellence
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-6 text-center hover:shadow-lg transition-shadow duration-200">
                <div className="flex justify-center mb-4">
                  {stat.icon}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  <Counter end={stat.value} suffix={stat.suffix} />
                </h3>
                <p className="text-gray-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-16 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Strategic Partners</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Collaborating with industry leaders to deliver exceptional steel products and services
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {partners.map((partner, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200">
                <img
                  src={partner.image}
                  alt={partner.name}
                  className="w-full h-48 object-cover"
                />
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{partner.name}</h3>
                  <div className="flex items-center text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    <span>{partner.contact}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Get in Touch</h2>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Ready to discuss your steel requirements? Contact our expert team today
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Contact Information</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Phone className="h-5 w-5 mr-3 text-teal-500" />
                  <span>+91 (891) 2565-000</span>
                </div>
                <div className="flex items-center">
                  <Mail className="h-5 w-5 mr-3 text-teal-500" />
                  <span>info@rinl.co.in</span>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Business Hours</h3>
              <div className="space-y-2 text-gray-300">
                <p>Monday - Friday: 8:00 AM - 6:00 PM</p>
                <p>Saturday: 9:00 AM - 4:00 PM</p>
                <p>Sunday: Emergency Operations Only</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;