import React, { useState, useEffect } from 'react';
import {
  User, Phone, MapPin, Shield, Save, ArrowLeft,
  AlertTriangle, Trash2, CheckCircle2, Lock, X, Loader
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { updatePatientProfile, deletePatientAccount, fetchCurrentUser } from '../../services/api';
import DistrictCombobox from '../../components/Common/DistrictCombobox';
import { DEFAULT_DISTRICT } from '../../data/districts';

export default function PatientSettingsPage({ onBack, onNavigateToCases, showToast }) {
  const { user, updateUser, logout } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [district, setDistrict] = useState(user?.district || DEFAULT_DISTRICT);
  const [village, setVillage] = useState(user?.village || 'Local Area');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Delete Account Modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Sync state if user changes
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setDistrict(user.district || DEFAULT_DISTRICT);
      setVillage(user.village || 'Local Area');
      if (!user.phone_number) {
        fetchCurrentUser()
          .then((profile) => {
            if (profile && profile.phone_number) {
              updateUser(profile);
            }
          })
          .catch(() => {});
      }
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setSaveError('Please enter your full name.');
      return;
    }
    setIsSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      const updatedProfile = await updatePatientProfile({
        full_name: fullName.trim(),
        district: district.trim(),
        village: village.trim()
      });

      updateUser(updatedProfile);
      setSaveSuccess(true);
      if (showToast) showToast('Profile details updated successfully.');
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      setSaveError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setDeleteError('');
    try {
      await deletePatientAccount();
      setShowDeleteModal(false);
      logout();
      if (showToast) showToast('Your patient account has been permanently deleted.');
      if (onBack) onBack();
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete account. Please try again.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="patient-settings-page-wrapper">
      {/* Top Breadcrumb & Navigation */}
      <div className="patient-settings-container">
        <div className="settings-nav-header">
          <button onClick={onBack} className="settings-back-btn" id="back-to-home-btn">
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </button>
          {onNavigateToCases && (
            <button onClick={onNavigateToCases} className="settings-cases-link-btn">
              <span>View My Care Consultations →</span>
            </button>
          )}
        </div>

        {/* Page Title Card */}
        <div className="settings-header-card">
          <div className="settings-avatar-badge">
            <User size={28} className="text-teal-700" />
          </div>
          <div>
            <h1 className="settings-main-title">Patient Profile & Account Settings</h1>
            <p className="settings-subtitle">
              Manage your personal healthcare profile, residential district, and account preferences
            </p>
          </div>
        </div>

        {/* Profile Edit Form Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <h2>Personal Information</h2>
            <p>Your details are used for clinical follow-ups and local health centre referrals.</p>
          </div>

          {saveSuccess && (
            <div className="settings-alert-success">
              <CheckCircle2 size={16} />
              <span>Profile details updated and saved successfully!</span>
            </div>
          )}

          {saveError && (
            <div className="settings-alert-error">
              <AlertTriangle size={16} />
              <span>{saveError}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="settings-form">
            {/* Phone Number (Read Only) */}
            <div className="settings-form-group">
              <label htmlFor="settings-phone">Registered Mobile Number (Login ID)</label>
              <div className="settings-readonly-input-wrap">
                <Phone size={16} className="text-slate-400" />
                <input
                  id="settings-phone"
                  type="text"
                  value={user?.phone_number || (user?.username && /^[\d+\s-]+$/.test(user.username) ? user.username : '')}
                  placeholder="Registered Phone Number"
                  readOnly
                  disabled
                  className="settings-readonly-input"
                />
                <span className="settings-verified-tag">
                  <CheckCircle2 size={12} className="text-emerald-600" />
                  <span>Verified</span>
                </span>
              </div>
              <span className="settings-field-hint">
                Your mobile phone number serves as your secure account identifier and cannot be changed here.
              </span>
            </div>

            {/* Full Name */}
            <div className="settings-form-group">
              <label htmlFor="settings-name">Full Name / Patient Name</label>
              <div className="settings-input-wrap">
                <User size={16} className="text-slate-400" />
                <input
                  id="settings-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setSaveError(''); }}
                  placeholder="Enter your full name"
                  className="settings-input"
                  required
                />
              </div>
            </div>

            {/* District Combobox */}
            <div className="settings-form-group">
              <label>District (All India / State)</label>
              <DistrictCombobox
                selectedDistrict={district}
                onSelectDistrict={(d) => { setDistrict(d); setSaveError(''); }}
                placeholder="Select your district..."
              />
              <span className="settings-field-hint">
                Determines nearest Primary Health Centres (PHC) and local ASHA community support.
              </span>
            </div>

            {/* Village / Area */}
            <div className="settings-form-group">
              <label htmlFor="settings-village">Village / Local Area / Block</label>
              <div className="settings-input-wrap">
                <MapPin size={16} className="text-slate-400" />
                <input
                  id="settings-village"
                  type="text"
                  value={village}
                  onChange={(e) => { setVillage(e.target.value); setSaveError(''); }}
                  placeholder="e.g. Rustampur, Chunar, Ward 12"
                  className="settings-input"
                />
              </div>
            </div>

            {/* Submit Actions */}
            <div className="settings-actions-row">
              <button
                type="submit"
                className="settings-save-btn"
                disabled={isSaving}
                id="save-profile-btn"
              >
                {isSaving ? (
                  <>
                    <Loader size={16} className="spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onBack}
                className="settings-cancel-btn"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Danger Zone: Delete Account */}
        <div className="settings-card settings-danger-card">
          <div className="settings-danger-header">
            <div className="settings-danger-icon-pill">
              <Trash2 size={20} className="text-red-600" />
            </div>
            <div>
              <h3 className="text-red-700 font-bold text-base">Delete Account</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Permanently remove your login account and associated profile information.
              </p>
            </div>
          </div>

          <p className="settings-danger-description">
            Once deleted, you will be logged out and your phone number credentials will be permanently removed. 
            Any future visits will require creating a new patient profile.
          </p>

          <button
            type="button"
            className="settings-delete-account-btn"
            onClick={() => {
              setDeleteError('');
              setShowDeleteModal(true);
            }}
            id="delete-account-btn"
          >
            <Trash2 size={15} />
            <span>Delete Patient Account</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showDeleteModal && (
        <div className="auth-modal-overlay">
          <div className="auth-modal-card settings-delete-modal-card">
            <button
              className="auth-close-btn"
              onClick={() => !isDeleting && setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              <X size={20} />
            </button>

            <div className="text-center mb-4">
              <div className="settings-modal-warn-icon">
                <AlertTriangle size={32} color="#dc2626" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mt-2">Delete Account Confirmation</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete your VaaniDoc patient account?
              </p>
            </div>

            {deleteError && (
              <div className="settings-alert-error mb-3">
                <AlertTriangle size={14} />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="settings-delete-notice-box">
              <p>
                <strong>Warning:</strong> This action cannot be undone. Your profile credentials for 
                <strong> {user?.phone_number || user?.username}</strong> will be permanently removed, 
                and you will no longer be able to log in with this account.
              </p>
            </div>

            <div className="settings-delete-modal-actions">
              <button
                type="button"
                className="settings-modal-cancel-btn"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Keep Account / Cancel
              </button>
              <button
                type="button"
                className="settings-modal-confirm-delete-btn"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                id="confirm-delete-account-btn"
              >
                {isDeleting ? (
                  <>
                    <Loader size={16} className="spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  'Yes, Delete My Account'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
