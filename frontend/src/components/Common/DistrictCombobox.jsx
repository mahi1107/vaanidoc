import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MapPin, Search, ChevronDown, Check, X } from 'lucide-react';
import { ALL_INDIAN_DISTRICTS, DEFAULT_DISTRICT } from '../../data/districts';

/**
 * Custom Searchable Combobox for selecting any Indian District.
 * - Shows district names only (no state names displayed)
 * - Sorted alphabetically
 * - Real-time substring filter input with clear button
 * - Full keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
 * - Accessible empty state
 * - Closes on selection or click-outside
 * - Pure custom CSS component (no native <select>)
 */
export default function DistrictCombobox({
  selectedDistrict = DEFAULT_DISTRICT,
  onSelectDistrict,
  placeholder = 'Select District...',
  showAllOption = false,
  allOptionLabel = 'All Districts (India)',
  id = 'district-combobox',
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  // Compute filtered district list
  const filteredDistricts = useMemo(() => {
    const list = [...ALL_INDIAN_DISTRICTS];
    if (showAllOption) {
      list.unshift(allOptionLabel);
    }
    if (!searchQuery.trim()) {
      return list;
    }
    const q = searchQuery.toLowerCase().trim();
    return list.filter(d => d.toLowerCase().includes(q));
  }, [searchQuery, showAllOption, allOptionLabel]);

  // Open dropdown and focus search input
  const handleToggle = () => {
    if (!isOpen) {
      setIsOpen(true);
      setSearchQuery('');
      setHighlightedIndex(-1);
    } else {
      setIsOpen(false);
    }
  };

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Handle item selection
  const handleSelect = (district) => {
    const finalVal = district === allOptionLabel ? '' : district;
    if (onSelectDistrict) {
      onSelectDistrict(finalVal || district);
    }
    setIsOpen(false);
    setSearchQuery('');
    setHighlightedIndex(-1);
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => {
        const next = prev < filteredDistricts.length - 1 ? prev + 1 : 0;
        scrollItemIntoView(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => {
        const next = prev > 0 ? prev - 1 : filteredDistricts.length - 1;
        scrollItemIntoView(next);
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredDistricts.length) {
        handleSelect(filteredDistricts[highlightedIndex]);
      } else if (filteredDistricts.length === 1) {
        handleSelect(filteredDistricts[0]);
      }
    }
  };

  const scrollItemIntoView = (index) => {
    if (listRef.current) {
      const items = listRef.current.querySelectorAll('.combobox-option');
      if (items[index]) {
        items[index].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  };

  const displayValue = selectedDistrict || placeholder;

  return (
    <div 
      className={`custom-district-combobox-wrapper ${className}`} 
      ref={containerRef}
      onKeyDown={handleKeyDown}
      id={id}
    >
      {/* Trigger Button */}
      <button
        type="button"
        className={`combobox-trigger-btn ${isOpen ? 'active' : ''}`}
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <MapPin size={16} className="combobox-pin-icon" />
        <span className="combobox-selected-text">
          {displayValue}
        </span>
        <ChevronDown size={15} className={`combobox-chevron-icon ${isOpen ? 'rotated' : ''}`} />
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div className="combobox-dropdown-card" role="listbox">
          {/* Search Header Input */}
          <div className="combobox-search-header">
            <Search size={15} className="combobox-search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              className="combobox-search-input"
              placeholder="Search district name (e.g. Vadodara, Varanasi)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightedIndex(0);
              }}
              aria-label="Search Indian district"
            />
            {searchQuery && (
              <button
                type="button"
                className="combobox-clear-btn"
                onClick={() => {
                  setSearchQuery('');
                  if (searchInputRef.current) searchInputRef.current.focus();
                }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* District Count Badge */}
          <div className="combobox-count-bar">
            <span>{filteredDistricts.length} districts available across India</span>
          </div>

          {/* Options List */}
          <div className="combobox-options-list" ref={listRef}>
            {filteredDistricts.length === 0 ? (
              <div className="combobox-empty-state">
                <p className="empty-title">No district found</p>
                <p className="empty-subtitle">No matching Indian district for "{searchQuery}"</p>
              </div>
            ) : (
              filteredDistricts.map((districtName, index) => {
                const isSelected = selectedDistrict === districtName || (!selectedDistrict && districtName === allOptionLabel);
                const isHighlighted = highlightedIndex === index;

                return (
                  <div
                    key={districtName}
                    role="option"
                    aria-selected={isSelected}
                    className={`combobox-option ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                    onClick={() => handleSelect(districtName)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <span className="option-name">{districtName}</span>
                    {isSelected && <Check size={16} className="option-check-icon" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
