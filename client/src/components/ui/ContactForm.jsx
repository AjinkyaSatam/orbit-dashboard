import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import axios from 'axios';

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] } },
};

export default function ContactForm() {
  const [status, setStatus] = useState('idle');
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data) => {
    setStatus('submitting');
    try {
      await axios.post('/api/contact', data);
      setStatus('success');
      reset();
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <motion.form className="contact-form" onSubmit={handleSubmit(onSubmit)} variants={fadeUp}>
      <div className="form-group">
        <label className="form-label" htmlFor="contact-name">Name</label>
        <input
          id="contact-name"
          className="form-input"
          type="text"
          placeholder="Your name"
          {...register('name')}
        />
        {errors.name && <span className="form-error">{errors.name.message}</span>}
      </div>
      
      <div className="form-group">
        <label className="form-label" htmlFor="contact-email">Email</label>
        <input
          id="contact-email"
          className="form-input"
          type="email"
          placeholder="you@example.com"
          {...register('email')}
        />
        {errors.email && <span className="form-error">{errors.email.message}</span>}
      </div>
      
      <div className="form-group">
        <label className="form-label" htmlFor="contact-msg">Message</label>
        <textarea
          id="contact-msg"
          className="form-input"
          rows={5}
          placeholder="How can we help?"
          {...register('message')}
        />
        {errors.message && <span className="form-error">{errors.message.message}</span>}
      </div>
      
      <button type="submit" className="btn-primary" disabled={status === 'submitting' || status === 'success'}>
        {status === 'submitting' ? (
          'Sending...'
        ) : status === 'success' ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Check size={16} strokeWidth={1.5} /> Sent
          </span>
        ) : status === 'error' ? (
          'Error. Try again.'
        ) : (
          'Send Message'
        )}
      </button>
    </motion.form>
  );
}
