import React, { useState } from 'react';
import { X, Phone, Lock, User, CheckCircle, ShieldCheck } from 'lucide-react';
import { patientLogin, patientRegister } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_DISTRICT } from '../../data/districts';
import DistrictCombobox from '../../components/Common/DistrictCombobox';

export default function PatientAuthModal({ isOpen, onClose, onSuccess }) {
  const { loginSuccess } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [district, setDistrict] = useState(DEFAULT_DISTRICT);
  const [village, setVillage] = useState('Local Area');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handlePhoneChange = (e) => {
    setPhone(e.target.value);
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const data = await patientRegister({
          phone_number: phone,
          full_name: fullName.trim() || `Patient (${phone.slice(-4)})`,
          district,
          village: village.trim() || 'Local Area',
          password: password.trim() || 'patient123'
        });
        loginSuccess(data.user, data.access_token);
        if (onSuccess) onSuccess(data.user);
        onClose();
      } else {
        const data = await patientLogin(phone, password.trim() || 'patient123');
        loginSuccess(data.user, data.access_token);
        if (onSuccess) onSuccess(data.user);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal-card">
        <button className="auth-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        <div className="auth-modal-header">
          <ShieldCheck size={28} className="text-teal-600 mb-2" />
          <h3>{isRegister ? 'Create Patient Account' : 'Sign In to View My Cases'}</h3>
          <p>Access your persistent health consultation history and ASHA follow-ups</p>
        </div>

        {error && <div className="auth-error-pill">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form-fields">
          <div className="form-group-clean">
            <label>Mobile Phone Number</label>
            <div className="input-with-icon">
              <Phone size={16} className="text-slate-400" />
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={handlePhoneChange}
                required
                className="clean-text-input"
                autoFocus
              />
            </div>
          </div>

          {isRegister && (
            <>
              <div className="form-group-clean">
                <label>Full Name / Patient Name</label>
                <div className="input-with-icon">
                  <User size={16} className="text-slate-400" />
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); if (error) setError(null); }}
                    className="clean-text-input"
                  />
                </div>
              </div>

              <div className="form-group-clean">
                <label>District (All India)</label>
                <DistrictCombobox
                  selectedDistrict={district}
                  onSelectDistrict={(d) => { setDistrict(d); if (error) setError(null); }}
                  placeholder="Select your district..."
                  className="w-full"
                />
              </div>
            </>
          )}

          <div className="form-group-clean">
            <label>Password / Security PIN</label>
            <div className="input-with-icon">
              <Lock size={16} className="text-slate-400" />
              <input
                type="password"
                placeholder={isRegister ? "Create password (default: patient123)" : "Password (default: patient123)"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (error) setError(null); }}
                className="clean-text-input"
              />
            </div>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading || !phone.trim()}>
            {loading ? 'Processing...' : (isRegister ? 'Register & Continue' : 'Sign In')}
          </button>
        </form>

        <div className="auth-modal-footer">
          <button 
            type="button"
            className="toggle-auth-mode-btn"
            onClick={() => {
              setIsRegister(v => !v);
              setError(null);
            }}
          >
            {isRegister ? 'Already have an account? Sign in here' : "First time here? Register as new patient"}
          </button>
        </div>
      </div>
    </div>
  );
}
