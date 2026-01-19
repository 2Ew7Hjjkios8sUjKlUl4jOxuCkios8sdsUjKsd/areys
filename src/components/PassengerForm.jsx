import React, { useState, useEffect, useRef } from 'react';
import {
    User,
    Baby,
    Phone,
    Calendar,
    Hash,
    Plane,
    DollarSign,
    X,
    Plus,
    Save,
    Users
} from 'lucide-react';

import { useFlights } from '../context/FlightContext';
import { useAuth } from '../context/AuthContext';

const PassengerForm = ({ onAdd, onAddAndNew, initialData, onCancel, airlineConfig, currentFlight }) => {
    const { agencies, prices, agencyName: systemAgencyName } = useFlights();
    const { currentUserAgency } = useAuth();
    const [passenger, setPassenger] = useState({
        type: 'Adult',
        gender: 'M',
        name: '',
        hasInfants: false,
        infants: [],
        phoneNumber: '',
        date: currentFlight?.date || new Date().toISOString().split('T')[0],
        bookingReference: airlineConfig?.defaultBookingReference || 'AIEW07',
        flightNumber: currentFlight?.flightNumber || 'FLY24ADDB1',
        basePrice: (airlineConfig?.adultPrice ?? prices.adult),
        infantPrice: (airlineConfig?.infantPrice ?? prices.infant),
        tax: airlineConfig?.tax ?? prices.tax,
        surcharge: airlineConfig?.surcharge ?? prices.surcharge,
        totalPrice: (airlineConfig?.adultPrice ?? prices.adult) + (airlineConfig?.tax ?? prices.tax) + (airlineConfig?.surcharge ?? prices.surcharge),
        agency: currentUserAgency || systemAgencyName || 'Us',
        dateOfIssue: new Date().toISOString().split('T')[0],
    });

    const nameInputRef = useRef(null);
    const [errors, setErrors] = useState({});

    // 1. Handle Mode Switching (Add/Edit) or Flight Change -> Full Reset
    useEffect(() => {
        if (initialData) {
            setPassenger(initialData);
        } else {
            resetForm();
        }
    }, [initialData?.id, currentFlight?.id]);

    // 2. Handle Late-Loading Defaults (update only if specific fields are default/empty)
    useEffect(() => {
        if (!initialData && airlineConfig?.defaultBookingReference) {
            setPassenger(prev => {
                // Only update if currently using generic default or empty
                if (!prev.bookingReference || prev.bookingReference === 'AIEW07') {
                    return { ...prev, bookingReference: airlineConfig.defaultBookingReference };
                }
                return prev;
            });
        }
    }, [airlineConfig?.defaultBookingReference, initialData]);

    const resetForm = () => {
        const today = new Date();
        const formattedDate = currentFlight?.date
            ? new Date(currentFlight.date).toLocaleDateString('en-GB')
            : `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

        setPassenger({
            type: 'Adult',
            gender: 'M',
            name: '',
            hasInfants: false,
            infants: [],
            phoneNumber: '',
            date: currentFlight?.date || new Date().toISOString().split('T')[0],
            bookingReference: airlineConfig?.defaultBookingReference || 'AIEW07',
            flightNumber: currentFlight?.flightNumber || 'FLY24ADDB1',
            basePrice: (airlineConfig?.adultPrice ?? prices.adult),
            infantPrice: (airlineConfig?.infantPrice ?? prices.infant),
            tax: airlineConfig?.tax ?? prices.tax,
            surcharge: airlineConfig?.surcharge ?? prices.surcharge,
            totalPrice: (airlineConfig?.adultPrice ?? prices.adult) + (airlineConfig?.tax ?? prices.tax) + (airlineConfig?.surcharge ?? prices.surcharge),
            agency: currentUserAgency || systemAgencyName || 'Us',
            dateOfIssue: new Date().toISOString().split('T')[0],
        });
    };

    // 3. Automate Pricing based on Airline
    useEffect(() => {
        if (!initialData && airlineConfig) {
            const tax = airlineConfig.tax ?? prices.tax;
            const surcharge = airlineConfig.surcharge ?? prices.surcharge;
            setPassenger(prev => {
                const adultPrice = airlineConfig.adultPrice ?? prices.adult;
                const childPrice = airlineConfig.childPrice ?? prices.child;
                const base = prev.type === 'Child' ? childPrice : adultPrice;
                const infantRate = airlineConfig.infantPrice ?? prices.infant;
                const infantTotal = prev.infants.length * infantRate;

                return {
                    ...prev,
                    basePrice: base,
                    infantPrice: infantRate,
                    tax,
                    surcharge,
                    totalPrice: base + Number(tax || 0) + Number(surcharge || 0) + infantTotal
                };
            });
        }
    }, [airlineConfig, initialData]);

    const calculateTotal = (type, tax, surcharge, infantCount) => {
        const adultPrice = airlineConfig?.adultPrice ?? prices.adult;
        const childPrice = airlineConfig?.childPrice ?? prices.child;
        const base = type === 'Child' ? childPrice : adultPrice;
        const infantRate = airlineConfig?.infantPrice ?? prices.infant;
        return base + Number(tax || 0) + Number(surcharge || 0) + (infantCount * infantRate);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;

        // Clear error for this field when changed
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }

        setPassenger(prev => {
            let newState = { ...prev, [name]: val };

            if (name === 'hasInfants') {
                if (val && newState.infants.length === 0) {
                    newState.infants = [''];
                } else if (!val) {
                    newState.infants = [];
                }
            }

            if (name === 'tax' || name === 'surcharge' || name === 'hasInfants' || name === 'type') {
                const infantCount = newState.hasInfants && newState.type === 'Adult' ? newState.infants.length : 0;
                newState.totalPrice = calculateTotal(newState.type, newState.tax, newState.surcharge, infantCount);
            }
            if (name === 'type' && val === 'Child') {
                newState.hasInfants = false;
                newState.infants = [];
            }
            return newState;
        });
    };

    const addInfant = () => {
        if (passenger.infants.length < 5) {
            const newInfants = [...passenger.infants, ''];
            setPassenger(prev => ({
                ...prev,
                infants: newInfants,
                totalPrice: calculateTotal(prev.type, prev.tax, prev.surcharge, newInfants.length)
            }));
        }
    };

    const removeInfant = (index) => {
        const newInfants = passenger.infants.filter((_, i) => i !== index);
        setPassenger(prev => ({
            ...prev,
            infants: newInfants,
            hasInfants: newInfants.length > 0,
            totalPrice: calculateTotal(prev.type, prev.tax, prev.surcharge, newInfants.length)
        }));
    };

    const handleInfantChange = (index, value) => {
        const newInfants = [...passenger.infants];
        newInfants[index] = value;

        // Clear error when typing
        if (errors[`infant-${index}`]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[`infant-${index}`];
                return newErrors;
            });
        }

        setPassenger(prev => ({ ...prev, infants: newInfants }));
    };

    const handleSubmit = (e, andNew = false) => {
        if (e) e.preventDefault();

        const newErrors = {};

        // Explicit validation check
        if (!passenger.name.trim()) {
            newErrors.name = true;
        }

        // Validate infants if any
        if (passenger.hasInfants) {
            passenger.infants.forEach((name, idx) => {
                if (!name.trim()) {
                    newErrors[`infant-${idx}`] = true;
                }
            });
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            // Focus the first error field
            if (newErrors.name) {
                nameInputRef.current?.focus();
            }
            return;
        }

        const dataToSave = { ...passenger, id: passenger.id || Date.now() };

        if (andNew) {
            onAddAndNew(dataToSave);
            resetForm();

            // Focus and scroll to top for new entry
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                nameInputRef.current?.focus();
            }, 100);
        } else {
            onAdd(dataToSave);
            if (!initialData) resetForm();
        }
    };

    return (
        <form className="passenger-form" onSubmit={handleSubmit}>
            <div className="form-row">
                <div className="form-group">
                    <label><Users size={14} /> Passenger Type</label>
                    <select name="type" value={passenger.type} onChange={handleChange}>
                        <option value="Adult">Adult</option>
                        <option value="Child">Child</option>
                    </select>
                </div>
                {passenger.type === 'Adult' && (
                    <div className="form-group">
                        <label><User size={14} /> Gender</label>
                        <select name="gender" value={passenger.gender} onChange={handleChange}>
                            <option value="M">M (Male)</option>
                            <option value="F">F (Female)</option>
                        </select>
                    </div>
                )}
                <div className="form-group flex-2">
                    <label><User size={14} /> Full Name</label>
                    <input
                        type="text"
                        name="name"
                        ref={nameInputRef}
                        value={passenger.name}
                        onChange={handleChange}
                        placeholder="e.g. JOHN DOE"
                        className={errors.name ? 'error' : ''}
                        required
                    />
                </div>
            </div>

            {passenger.type === 'Adult' && (
                <div className="infant-section">
                    <div className="checkbox-group">
                        <input
                            type="checkbox"
                            id="hasInfants"
                            name="hasInfants"
                            checked={passenger.hasInfants}
                            onChange={handleChange}
                        />
                        <label htmlFor="hasInfants"><Baby size={16} /> Traveling with Infants?</label>
                    </div>

                    {passenger.hasInfants && (
                        <div className="infants-container">
                            {passenger.infants.map((infant, index) => (
                                <div key={index} className="infant-item">
                                    <div className="relative flex-1">
                                        <Baby size={16} className="absolute-icon" />
                                        <input
                                            type="text"
                                            value={infant}
                                            onChange={(e) => handleInfantChange(index, e.target.value)}
                                            placeholder={`Infant ${index + 1} Name`}
                                            className={`pl-10 ${errors[`infant-${index}`] ? 'error' : ''}`}
                                            required
                                        />
                                    </div>
                                    <button type="button" onClick={() => removeInfant(index)} className="btn-remove-infant">
                                        <X size={14} strokeWidth={3} />
                                        <span>Remove</span>
                                    </button>
                                </div>
                            ))}
                            {passenger.infants.length < 5 && (
                                <button type="button" onClick={addInfant} className="btn-add-sm">
                                    <Plus size={14} /> Add Infant
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="form-row">
                <div className="form-group">
                    <label><Phone size={14} /> Phone Number</label>
                    <input
                        type="text"
                        name="phoneNumber"
                        value={passenger.phoneNumber}
                        onChange={handleChange}
                        placeholder="For Manifest"
                    />
                </div>
                <div className="form-group">
                    <label><Calendar size={14} /> Travel Date</label>
                    <input
                        type="date"
                        name="date"
                        value={passenger.date}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label><Users size={14} /> Agency</label>
                    <select name="agency" value={passenger.agency} onChange={handleChange}>
                        <option value="Us">Us</option>
                        {agencies.map(agency => (
                            <option key={agency.id} value={agency.name}>{agency.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label><Hash size={14} /> Booking Reference</label>
                    <input
                        type="text"
                        name="bookingReference"
                        value={passenger.bookingReference}
                        onChange={handleChange}
                    />
                </div>
                <div className="form-group">
                    <label><Plane size={14} /> Flight Number</label>
                    <input
                        type="text"
                        name="flightNumber"
                        value={passenger.flightNumber}
                        onChange={handleChange}
                    />
                </div>
                <div className="form-group">
                    <label><Calendar size={14} /> Date of Issue</label>
                    <input
                        type="date"
                        name="dateOfIssue"
                        value={passenger.dateOfIssue}
                        onChange={handleChange}
                        required
                    />
                </div>
            </div>

            <div className="form-row pricing-row">
                <div className="form-group">
                    <label><DollarSign size={14} /> Tax ($)</label>
                    <input
                        type="number"
                        name="tax"
                        value={passenger.tax}
                        onChange={handleChange}
                    />
                </div>
                <div className="form-group">
                    <label><DollarSign size={14} /> Surcharge ($)</label>
                    <input
                        type="number"
                        name="surcharge"
                        value={passenger.surcharge}
                        onChange={handleChange}
                    />
                </div>
                <div className="form-group total-group">
                    <label><DollarSign size={14} /> Total Price ($)</label>
                    <input
                        type="number"
                        name="totalPrice"
                        value={passenger.totalPrice}
                        onChange={handleChange}
                        className="total-input"
                    />
                </div>
            </div>

            <div className="form-actions-inline" style={{ marginTop: '2rem' }}>
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={(e) => handleSubmit(e, false)}
                >
                    <Save size={18} /> {initialData ? "Update Ticket" : "Add Ticket to Flight"}
                </button>

                {!initialData && onAddAndNew && (
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={(e) => handleSubmit(e, true)}
                    >
                        <Plus size={18} /> Add & New
                    </button>
                )}

                {initialData && (
                    <button type="button" onClick={onCancel} className="btn btn-secondary">
                        Cancel
                    </button>
                )}
            </div>
        </form>
    );
};

export default PassengerForm;
