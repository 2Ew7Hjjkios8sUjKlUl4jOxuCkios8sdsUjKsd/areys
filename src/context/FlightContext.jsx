import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const FlightContext = createContext();

export const FlightProvider = ({ children }) => {
    const { currentUser, userRole } = useAuth();

    const [flights, setFlights] = useState([]);
    const [airlines, setAirlines] = useState([]);
    const [agencies, setAgencies] = useState([]);
    const [prices, setPrices] = useState({
        adult: 130,
        child: 90,
        infant: 20,
        tax: 10,
        surcharge: 10
    });
    const [users, setUsers] = useState([]);
    const [roleDefinitions, setRoleDefinitions] = useState([]);
    const [targetUserId, setTargetUserId] = useState(null);
    const [agencyName, setAgencyName] = useState('AREYS');
    const [agencyTagline, setAgencyTagline] = useState('Travel Agency');
    const [loading, setLoading] = useState(true);

    // Store channel subscriptions for cleanup
    const channelsRef = useRef([]);

    // Load data from Supabase logic
    const loadInitialData = React.useCallback(async () => {
        if (!currentUser) {
            console.log('FlightContext: No user, clearing state');
            setFlights([]);
            setAirlines([]);
            setAgencies([]);
            setPrices({ adult: 130, child: 90, infant: 20, tax: 10, surcharge: 10 });
            setUsers([]);
            setRoleDefinitions([]);
            setLoading(false);
            return;
        }

        console.log('FlightContext: Loading data for user', currentUser.id);
        const userId = currentUser.id;

        try {
            // Determine whose data to fetch
            let targetUserId = userId;

            // Get user role information to check if this is a managed user (Staff)
            const { data: roleData } = await supabase
                .from('user_roles')
                .select('role, created_by')
                .eq('user_id', userId)
                .maybeSingle();

            // If user is Staff/Manager and has a creator, fetch the Creator's data instead
            if (roleData && roleData.created_by && roleData.role !== 'Admin') {
                console.log('FlightContext: User is managed, fetching data for owner:', roleData.created_by);
                targetUserId = roleData.created_by;
            }

            setTargetUserId(targetUserId);

            // Use Promise.all to fetch all datasets in parallel for the TARGET user
            const results = await Promise.all([
                supabase.from('flights').select('*').eq('user_id', targetUserId),
                supabase.from('passengers').select('*').eq('user_id', targetUserId),
                supabase.from('infants').select('*').eq('user_id', targetUserId), // Load infants separately
                supabase.from('airlines').select('*').eq('user_id', targetUserId),
                supabase.from('agencies').select('*').eq('user_id', targetUserId),
                supabase.from('settings').select('*').eq('user_id', targetUserId).maybeSingle(),
                supabase.from('managed_users').select('*').eq('user_id', targetUserId),
                supabase.from('role_permissions').select('*')
            ]);

            const [flightsRes, passengersRes, infantsRes, airlinesRes, agenciesRes, settingsRes, usersRes, rolesRes] = results;

            let currentRoleDefs = [];
            if (rolesRes && !rolesRes.error && rolesRes.data) {
                setRoleDefinitions(rolesRes.data);
                currentRoleDefs = rolesRes.data;
            }

            // 1. Flights (with Passengers and Infants joined in memory)
            if (!flightsRes.error && flightsRes.data) {
                let flightData = flightsRes.data;

                // Join passengers and infants in memory
                const passengersData = passengersRes?.data || [];
                const infantsData = infantsRes?.data || [];

                // First, join infants to passengers
                const passengersWithInfants = passengersData.map(passenger => ({
                    ...passenger,
                    infants: infantsData
                        .filter(infant => infant.passenger_id === passenger.id)
                        .map(i => i.name) // Map to string array for compatibility
                }));

                // Then join passengers to flights
                flightData = flightData.map(flight => ({
                    ...flight,
                    flightNumber: flight.flight_number, // Map snake_case to camelCase
                    passengers: passengersWithInfants.filter(p => p.flight_id === flight.uuid)
                }));

                // Filter based on "See Own" vs "See Any"
                if (userRole !== 'Admin') {
                    const myRoleDef = currentRoleDefs.find(r => r.role === userRole);
                    if (myRoleDef) {
                        const canViewAnyFlight = myRoleDef.permissions?.flight?.view_any;
                        const canViewOwnFlight = myRoleDef.permissions?.flight?.view_own;
                        const canViewAnyPassenger = myRoleDef.permissions?.passenger?.view_any;
                        const canViewOwnPassenger = myRoleDef.permissions?.passenger?.view_own;

                        // Filter Flights
                        if (!canViewAnyFlight) {
                            if (canViewOwnFlight) {
                                flightData = flightData.filter(f => f.created_by === currentUser.id);
                            } else {
                                flightData = [];
                            }
                        }

                        // Filter Passengers within those flights
                        flightData = flightData.map(f => ({
                            ...f,
                            passengers: (f.passengers || []).filter(p => {
                                if (canViewAnyPassenger) return true;
                                if (canViewOwnPassenger) return p.created_by === currentUser.id;
                                return false;
                            }).map(p => ({
                                ...p,
                                flightNumber: p.flight_number,
                                bookingReference: p.booking_reference,
                                tax: p.tax,
                                surcharge: p.surcharge
                            }))
                        }));
                    }
                }

                flightData.sort((a, b) => new Date(b.date) - new Date(a.date));
                setFlights(flightData);
            }

            // 2. Airlines
            if (!airlinesRes.error && airlinesRes.data) {
                let airlineData = airlinesRes.data.map(a => ({
                    id: a.id,
                    name: a.name,
                    ticketTemplate: a.ticket_template,
                    manifestUs: a.manifest_us,
                    manifestAirport: a.manifest_airport,
                    defaultBookingReference: a.default_booking_reference,
                    defaultFlightNumber: a.default_flight_number,
                    adultPrice: a.adult_price,
                    childPrice: a.child_price,
                    infantPrice: a.infant_price,
                    tax: a.tax,
                    surcharge: a.surcharge,
                    updatedAt: a.updated_at,
                    updatedBy: a.updated_by
                }));
                setAirlines(airlineData);
            }

            // 3. Agencies
            if (!agenciesRes.error && agenciesRes.data) {
                setAgencies(agenciesRes.data.map(a => ({
                    id: a.id,
                    name: a.name,
                    phone: a.phone,
                    managerName: a.manager_name,
                    managerPhone: a.manager_phone,
                    updatedAt: a.updated_at,
                    updatedBy: a.updated_by
                })));
            }

            // 4. Settings
            if (settingsRes.error) {
                console.error('FlightContext: Error loading settings:', settingsRes.error);
            }
            if (!settingsRes.error && settingsRes.data) {
                const d = settingsRes.data;
                setPrices({
                    adult: parseFloat(d.adult_price) || 130,
                    child: parseFloat(d.child_price) || 90,
                    infant: parseFloat(d.infant_price) || 20,
                    tax: parseFloat(d.tax) || 10,
                    surcharge: parseFloat(d.surcharge) || 10,
                    updatedAt: d.updated_at,
                    updatedBy: d.updated_by
                });
                if (d.agency_name) setAgencyName(d.agency_name);
                if (d.agency_tagline) setAgencyTagline(d.agency_tagline);
            }

            // 5. Managed Users & Roles
            if (!usersRes.error && usersRes.data) {
                setUsers(usersRes.data.map(u => ({
                    id: u.id,
                    managed_user_id: u.managed_user_id, // Important for syncing!
                    name: u.name,
                    email: u.email,
                    role: u.role,
                    active: u.active,
                    agencyName: u.agency_name
                })));
            }

            // 6. Resolve names for everyone in the account (Admin + Staff)
            const { data: allAccountRoles } = await supabase
                .from('user_roles')
                .select('user_id, name, email, agency_name')
                .or(`user_id.eq.${targetUserId},created_by.eq.${targetUserId}`);

            if (allAccountRoles) {
                setUsers(prev => {
                    const merged = [...prev];
                    allAccountRoles.forEach(au => {
                        const existing = merged.find(m => m.managed_user_id === au.user_id || m.id === au.user_id);
                        if (!existing) {
                            merged.push({
                                id: au.user_id,
                                name: au.name || au.email?.split('@')[0] || 'Unknown',
                                email: au.email,
                                agencyName: au.agency_name,
                                isAccountUser: true
                            });
                        } else {
                            if (!existing.name && au.name) existing.name = au.name;
                            if (!existing.agencyName && au.agency_name) existing.agencyName = au.agency_name;
                        }
                    });
                    return merged;
                });
            }

            if (rolesRes && !rolesRes.error && rolesRes.data) {
                setRoleDefinitions(rolesRes.data);
            }

            console.log('FlightContext: Initial data ready');
        } catch (err) {
            console.error('FlightContext: Fatal error in loadInitialData:', err);
        } finally {
            setLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        let isMounted = true;

        setLoading(true); // Set loading true at the start of useEffect
        loadInitialData();

        const setupSubscription = async () => {
            if (!currentUser) return;

            // Subscriptions
            const flightsChannel = supabase
                .channel('flights-changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'flights', filter: `user_id=eq.${currentUser.id}` },
                    () => loadInitialData()
                ).subscribe();

            if (isMounted) {
                channelsRef.current.push(flightsChannel);
            } else {
                supabase.removeChannel(flightsChannel);
            }
        };

        setupSubscription();

        return () => {
            isMounted = false;
            channelsRef.current.forEach(channel => supabase.removeChannel(channel));
            channelsRef.current = [];
        };
    }, [loadInitialData, currentUser]);

    // Activity Logging Helper
    const logActivity = async (actionType, entityType, entityId, description, details = {}) => {
        try {
            await supabase.from('activity_logs').insert({
                user_id: currentUser.id,
                action_type: actionType,
                entity_type: entityType,
                entity_id: entityId,
                description: description,
                details: details,
                created_by: currentUser.id
            });
        } catch (err) {
            console.error('Failed to log activity:', err);
            // Don't block main flow if logging fails
        }
    };

    // Flight Operations
    const createFlight = async (flight) => {
        if (!currentUser || !targetUserId) return;

        const flightData = {
            user_id: targetUserId,
            airline: flight.airline,
            flight_number: flight.flightNumber || flight.flight_number,
            date: flight.date,
            route: flight.route,
            created_by: currentUser.id
            // NO passengers field - they're added separately to passengers table
        };

        const { data, error } = await supabase
            .from('flights')
            .insert(flightData)
            .select('*')
            .single();

        if (error) {
            console.error('Error creating flight:', error);
            toast.error(`Failed to create flight: ${error.message || error.code}`);
            throw error;
        }

        if (data) {
            setFlights(prev => [...prev, { ...data, passengers: [] }].sort((a, b) => new Date(b.date) - new Date(a.date)));

            toast.success('Flight created successfully');
            return data;
        }
    };

    const updateFlight = async (id, updatedFlight) => {
        if (!currentUser) return;
        const flightData = {
            airline: updatedFlight.airline,
            flight_number: updatedFlight.flightNumber || updatedFlight.flight_number,
            date: updatedFlight.date,
            route: updatedFlight.route
        };

        // Ownership Check
        const flight = flights.find(f => f.id === id);
        const isOwner = flight?.created_by === currentUser.id;

        if (!hasPermission('flight', 'delete') && !isOwner) {
            toast.error('You do not have permission to edit flights you did not create');
            return;
        }

        const { data, error } = await supabase
            .from('flights')
            .update(flightData)
            .eq('id', id)
            .eq('user_id', targetUserId)
            .select('*')
            .single();

        if (error) {
            console.error('Error updating flight:', error);
            toast.error(`Failed to update flight: ${error.message || error.code}`);
            throw error;
        }

        if (data) {
            setFlights(prev => prev.map(f => f.id === id ? { ...f, ...data } : f));

            // Log update with diff
            const before = {
                airline: flight.airline,
                date: flight.date,
                route: flight.route,
                flightNumber: flight.flightNumber || flight.flight_number
            };
            const after = {
                airline: data.airline,
                date: data.date,
                route: data.route,
                flightNumber: data.flight_number
            };

            await logActivity('UPDATE', 'FLIGHT', id,
                `Updated flight ${data.airline} - ${data.date} details`,
                { before, after }
            );

            toast.success('Flight updated successfully');
        }
    };

    const deleteFlight = async (id) => {
        if (!currentUser) return;
        // Ownership Check
        const flight = flights.find(f => f.id === id);
        const isOwner = flight?.created_by === currentUser.id;

        if (!hasPermission('flight', 'delete') && !isOwner) {
            toast.error('You do not have permission to delete flights you did not create');
            return;
        }

        const { error } = await supabase
            .from('flights')
            .delete()
            .eq('id', id)
            .eq('user_id', targetUserId);

        if (error) {
            console.error('Error deleting flight:', error);
            toast.error(`Failed to delete flight: ${error.message || error.code}`);
            throw error;
        }

        // Optimistically update local state
        setFlights(prev => prev.filter(f => f.id !== id));

        // Log deletion
        if (flight) {
            await logActivity('DELETE', 'FLIGHT', id,
                `Deleted flight ${flight.flightNumber || flight.flight_number} (${flight.airline} - ${flight.date})`
            );
        }

        toast.success('Flight deleted successfully');
    };

    const getFlight = (id) => {
        const flight = flights.find(f =>
            f.uuid === id ||
            f.id === id ||
            f.id === id.toString() ||
            f.id === parseInt(id)
        );
        return flight || null;
    };

    // Passenger Operations - Relational
    const addPassengerToFlight = async (flightId, passenger) => {
        if (!currentUser) return;

        const flight = getFlight(flightId);
        if (!flight) {
            toast.error('Flight not found');
            return;
        }

        // Helper to check if ID is a valid UUID (not a timestamp)
        const isValidUUID = (id) => {
            if (!id) return false;
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            return uuidRegex.test(id);
        };

        // Helper to manage infants in separate table
        const manageInfants = async (passengerId, userId, infantNames, creatorId) => {
            // 1. Delete existing infants for this passenger
            const { error: deleteError } = await supabase
                .from('infants')
                .delete()
                .eq('passenger_id', passengerId);

            if (deleteError) {
                console.error('Error clearing infants:', deleteError);
                throw deleteError;
            }

            // 2. Insert new infants if any
            if (infantNames && infantNames.length > 0) {
                const infantsToInsert = infantNames
                    .filter(name => name && name.trim().length > 0)
                    .map(name => ({
                        passenger_id: passengerId,
                        user_id: userId,
                        name: name.trim(),
                        created_by: creatorId
                    }));

                if (infantsToInsert.length > 0) {
                    const { error: insertError } = await supabase
                        .from('infants')
                        .insert(infantsToInsert);

                    if (insertError) {
                        console.error('Error inserting infants:', insertError);
                        throw insertError;
                    }
                }
            }
        };

        // Check if updating existing passenger (must have valid UUID)
        if (passenger.id && isValidUUID(passenger.id)) {
            // Find existing passenger for diff
            const existingPassenger = flight.passengers.find(p => p.id === passenger.id);

            // UPDATE operation
            const { data, error } = await supabase
                .from('passengers')
                .update({
                    name: passenger.name,
                    type: passenger.type,
                    gender: passenger.gender,
                    phone_number: passenger.phoneNumber,
                    agency: passenger.agency,
                    flight_number: passenger.flightNumber,
                    booking_reference: passenger.bookingReference,
                    ticket_price: passenger.ticketPrice || passenger.basePrice || 0,
                    tax: passenger.tax,
                    surcharge: passenger.surcharge,
                    total_price: passenger.totalPrice,
                    date_of_issue: passenger.dateOfIssue,
                    updated_by: currentUser.id
                })
                .eq('id', passenger.id)
                .eq('user_id', targetUserId)
                .select('*')
                .single();

            if (error) {
                console.error('Error updating passenger:', error);
                toast.error(`Failed to update passenger: ${error.message}`);
                throw error;
            }

            if (data) {
                // Update Infants
                await manageInfants(data.id, targetUserId, passenger.infants, currentUser.id);

                // Update local state (Optimistic refresh of infants)
                setFlights(prev => prev.map(f => {
                    if (f.uuid === flight.uuid || f.id === flightId) {
                        return {
                            ...f,
                            passengers: f.passengers.map(p => p.id === data.id ? {
                                ...data,
                                phoneNumber: data.phone_number,
                                flightNumber: data.flight_number,
                                bookingReference: data.booking_reference,
                                infants: passenger.infants
                            } : p)
                        };
                    }
                    return f;
                }));

                // Log Update with diff
                if (existingPassenger) {
                    const before = {
                        name: existingPassenger.name,
                        type: existingPassenger.type,
                        agency: existingPassenger.agency,
                        phone: existingPassenger.phone_number,
                        infants: (existingPassenger.infants || []).join(', '),
                        price: (parseFloat(existingPassenger.ticketPrice || 0) + parseFloat(existingPassenger.tax || 0)).toString(),
                        bookingRef: existingPassenger.booking_reference,
                        flightNo: existingPassenger.flight_number,
                        dateOfIssue: existingPassenger.date_of_issue
                    };
                    const after = {
                        name: data.name,
                        type: data.type,
                        agency: data.agency,
                        phone: data.phone_number,
                        infants: (passenger.infants || []).join(', '),
                        price: (parseFloat(data.ticket_price || 0) + parseFloat(data.tax || 0)).toString(),
                        bookingRef: data.booking_reference,
                        flightNo: data.flight_number,
                        dateOfIssue: data.date_of_issue
                    };

                    await logActivity('UPDATE', 'PASSENGER', data.id,
                        `Updated passenger ${data.name} on ${flight.airline} - ${flight.date}`,
                        { before, after }
                    );
                }

                toast.success('Passenger updated successfully');
            }
        } else {
            // INSERT operation
            const passengerData = {
                flight_id: flight.uuid, // Use UUID for foreign key
                user_id: targetUserId,
                name: passenger.name,
                type: passenger.type || 'Adult',
                gender: passenger.gender,
                phone_number: passenger.phoneNumber,
                agency: passenger.agency,
                flight_number: passenger.flightNumber,
                booking_reference: passenger.bookingReference,
                ticket_price: passenger.ticketPrice || passenger.basePrice || 0,
                tax: passenger.tax,
                surcharge: passenger.surcharge,
                total_price: passenger.totalPrice,
                date_of_issue: passenger.dateOfIssue || new Date().toISOString().split('T')[0],
                created_by: currentUser.id
            };

            const { data, error } = await supabase
                .from('passengers')
                .insert(passengerData)
                .select('*')
                .single();

            if (error) {
                console.error('Error adding passenger:', error);
                toast.error(`Failed to add passenger: ${error.message}`);
                throw error;
            }

            if (data) {
                // Update Infants
                await manageInfants(data.id, targetUserId, passenger.infants, currentUser.id);

                // Update local state
                setFlights(prev => prev.map(f => {
                    if (f.uuid === flight.uuid || f.id === flightId) {
                        return {
                            ...f,
                            passengers: [...(f.passengers || []), {
                                ...data,
                                phoneNumber: data.phone_number,
                                flightNumber: data.flight_number,
                                bookingReference: data.booking_reference,
                                infants: passenger.infants
                            }]
                        };
                    }
                    return f;
                }));

                toast.success('Passenger added successfully');
            }
        }
    };

    const removePassengerFromFlight = async (flightId, passengerId) => {
        if (!currentUser) return;

        const flight = getFlight(flightId);
        if (!flight) return;

        const passenger = flight.passengers?.find(p => p.id === passengerId);
        const isOwner = passenger?.created_by === currentUser.id;

        if (!hasPermission('passenger', 'delete') && !isOwner) {
            toast.error('You do not have permission to remove this passenger');
            return;
        }

        const { error } = await supabase
            .from('passengers')
            .delete()
            .eq('id', passengerId)
            .eq('user_id', targetUserId);

        if (error) {
            console.error('Error removing passenger:', error);
            toast.error(`Failed to remove passenger: ${error.message}`);
            throw error;
        }

        // Update local state
        setFlights(prev => prev.map(f => {
            if (f.uuid === flight.uuid || f.id === flightId) {
                return {
                    ...f,
                    passengers: f.passengers.filter(p => p.id !== passengerId)
                };
            }
            return f;
        }));

        // Log Deletion
        if (passenger) {
            await logActivity('DELETE', 'PASSENGER', passengerId,
                `Deleted passenger ${passenger.name} from ${flight.airline} - ${flight.date}`,
                { flight: `${flight.airline} ${flight.flightNumber}`, date: flight.date }
            );
        }

        toast.success('Passenger removed successfully');
    };

    // Airline Operations
    const addAirline = async (airline) => {
        if (!currentUser || !targetUserId) return;
        const airlineData = {
            user_id: targetUserId,
            name: airline.name,
            ticket_template: airline.ticketTemplate ?? airline.ticket_template ?? "",
            manifest_template: airline.manifestTemplate ?? airline.manifest_template ?? "",
            manifest_us: airline.manifestUs ?? airline.manifest_us ?? "",
            manifest_airport: airline.manifestAirport ?? airline.manifest_airport ?? "",
            default_booking_reference: airline.defaultBookingReference ?? airline.default_booking_reference ?? "",
            default_flight_number: airline.defaultFlightNumber ?? airline.default_flight_number ?? "",
            // Pricing Fields
            adult_price: airline.adultPrice ?? 0,
            child_price: airline.childPrice ?? 0,
            infant_price: airline.infantPrice ?? 0,
            tax: airline.tax ?? 0,
            surcharge: airline.surcharge ?? 0,
            updated_by: currentUser.id
        };

        if (airline.id) {
            airlineData.id = airline.id;
        }

        const { error } = await supabase
            .from('airlines')
            .insert(airlineData);

        if (error) {
            console.error('Error adding airline:', error);
            toast.error(`Failed to add airline: ${error.message || error.code}`);
            throw error;
        }

        // Optimistic refresh
        const { data: newAirlines } = await supabase.from('airlines').select('*').eq('user_id', currentUser.id);
        if (newAirlines) {
            setAirlines(newAirlines.map(a => ({
                id: a.id,
                name: a.name,
                ticketTemplate: a.ticket_template,
                manifestUs: a.manifest_us,
                manifestAirport: a.manifest_airport,
                defaultBookingReference: a.default_booking_reference,
                defaultFlightNumber: a.default_flight_number,
                adultPrice: a.adult_price,
                childPrice: a.child_price,
                infantPrice: a.infant_price,
                tax: a.tax,
                surcharge: a.surcharge
            })));
            toast.success('Airline added successfully');
        }
    };

    const updateAirline = async (id, updatedAirline) => {
        if (!currentUser) return;
        const airlineData = {
            name: updatedAirline.name,
            ticket_template: updatedAirline.ticketTemplate ?? updatedAirline.ticket_template ?? "",
            manifest_template: updatedAirline.manifestTemplate ?? updatedAirline.manifest_template ?? "",
            manifest_us: updatedAirline.manifestUs ?? updatedAirline.manifest_us ?? "",
            manifest_airport: updatedAirline.manifestAirport ?? updatedAirline.manifest_airport ?? "",
            default_booking_reference: updatedAirline.defaultBookingReference ?? updatedAirline.default_booking_reference ?? "",
            default_flight_number: updatedAirline.defaultFlightNumber ?? updatedAirline.default_flight_number ?? "",
            // Pricing Fields
            adult_price: updatedAirline.adultPrice ?? 0,
            child_price: updatedAirline.childPrice ?? 0,
            infant_price: updatedAirline.infantPrice ?? 0,
            tax: updatedAirline.tax ?? 0,
            surcharge: updatedAirline.surcharge ?? 0,
            updated_by: currentUser.id
        };

        const { error } = await supabase
            .from('airlines')
            .update(airlineData)
            .eq('id', id)
            .eq('user_id', targetUserId);

        if (error) {
            console.error('Error updating airline:', error);
            toast.error(`Failed to update airline: ${error.message || error.code}`);
            throw error;
        }

        // Optimistic update
        setAirlines(prev => prev.map(a => a.id === id ? { ...a, ...updatedAirline } : a));

        // Log Update
        const airline = airlines.find(a => a.id === id);
        if (airline) {
            await logActivity('UPDATE', 'AIRLINE', id,
                `Updated airline ${updatedAirline.name} settings`,
                { before: airline, after: updatedAirline }
            );
        }

        toast.success('Airline updated successfully');
    };

    const deleteAirline = async (id) => {
        if (!currentUser) return;
        const { error } = await supabase
            .from('airlines')
            .delete()
            .eq('id', id)
            .eq('user_id', targetUserId);

        if (error) {
            console.error('Error deleting airline:', error);
            toast.error(`Failed to delete airline: ${error.message || error.code}`);
            throw error;
        }

        // Optimistic update
        setAirlines(prev => prev.filter(a => a.id !== id));

        const airline = airlines.find(a => a.id === id);
        if (airline) {
            await logActivity('DELETE', 'AIRLINE', id,
                `Deleted airline ${airline.name}`
            );
        }

        toast.success('Airline deleted successfully');
    };

    const getAirline = (idOrName) => {
        return airlines.find(a => a.id === idOrName || a.name === idOrName);
    };

    // Agency Operations
    const addAgency = async (agency) => {
        if (!currentUser || !targetUserId) return;
        const agencyData = {
            user_id: targetUserId,
            name: agency.name,
            phone: agency.phone,
            manager_name: agency.managerName || agency.manager_name,
            manager_phone: agency.managerPhone || agency.manager_phone,
            updated_by: currentUser.id
        };

        if (agency.id) {
            agencyData.id = agency.id;
        }

        const { error } = await supabase
            .from('agencies')
            .insert(agencyData);

        if (error) {
            console.error('Error adding agency:', error);
            alert(`Failed to add agency: ${error.message || error.code}`);
            throw error;
        }

        // Optimistic update
        const { data: newAgencies } = await supabase.from('agencies').select('*').eq('user_id', currentUser.id);
        if (newAgencies) {
            setAgencies(newAgencies.map(a => ({
                id: a.id,
                name: a.name,
                phone: a.phone,
                managerName: a.manager_name,
                managerPhone: a.manager_phone
            })));
        }
    };

    const updateAgency = async (id, updatedAgency) => {
        if (!currentUser) return;
        const agencyData = {
            name: updatedAgency.name,
            phone: updatedAgency.phone,
            manager_name: updatedAgency.managerName || updatedAgency.manager_name,
            manager_phone: updatedAgency.managerPhone || updatedAgency.manager_phone,
            updated_by: currentUser.id
        };

        const { error } = await supabase
            .from('agencies')
            .update(agencyData)
            .eq('id', id)
            .eq('user_id', targetUserId);

        if (error) {
            console.error('Error updating agency:', error);
            alert(`Failed to update agency: ${error.message || error.code}`);
            throw error;
        }

        // Optimistic update
        setAgencies(prev => prev.map(a => a.id === id ? { ...a, ...updatedAgency } : a));

        const agency = agencies.find(a => a.id === id);
        if (agency) {
            await logActivity('UPDATE', 'AGENCY', id,
                `Updated agency ${updatedAgency.name} details`,
                { before: agency, after: updatedAgency }
            );
        }
    };

    const deleteAgency = async (id) => {
        if (!currentUser) return;
        const { error } = await supabase
            .from('agencies')
            .delete()
            .eq('id', id)
            .eq('user_id', targetUserId);

        if (error) {
            console.error('Error deleting agency:', error);
            alert(`Failed to delete agency: ${error.message || error.code}`);
            throw error;
        }

        // Optimistic update
        setAgencies(prev => prev.filter(a => a.id !== id));

        const agency = agencies.find(a => a.id === id);
        if (agency) {
            await logActivity('DELETE', 'AGENCY', id,
                `Deleted agency ${agency.name}`
            );
        }
    };

    // User Management Operations
    const addUser = async (user) => {
        // This is handled by createNewUser in AuthContext
        // But we keep this for compatibility
        if (!currentUser) return;
        // Note: Managed users are created via AuthContext.createNewUser
        // This function is kept for API compatibility but may not be used
        console.warn('addUser called but should use AuthContext.createNewUser');
    };

    const updateUser = async (id, updatedUser) => {
        if (!currentUser) return;
        const user = users.find(u => u.id === id || u.id === id.toString());
        const userData = {
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            active: updatedUser.active !== undefined ? updatedUser.active : true
        };

        const { error } = await supabase
            .from('managed_users')
            .update(userData)
            .eq('id', id)
            .eq('user_id', targetUserId);

        if (error) {
            console.error('Error updating user in managed_users:', error);
            throw error;
        }

        // Also update user_roles for the actual user account
        const { error: roleError } = await supabase
            .from('user_roles')
            .update({
                name: userData.name,
                role: userData.role,
                active: userData.active
            })
            .eq('user_id', user.managed_user_id || id); // managed_user_id is the actual UUID

        if (roleError) {
            console.warn('Warning: Could not sync update to user_roles table:', roleError);
        }
    };

    const toggleUserStatus = async (id) => {
        if (!currentUser) return;
        const user = users.find(u => u.id === id || u.id === id.toString());
        if (!user) return;

        const { error } = await supabase
            .from('managed_users')
            .update({ active: !user.active })
            .eq('id', id)
            .eq('user_id', targetUserId);

        if (error) {
            console.error('Error toggling user status in managed_users:', error);
            throw error;
        }

        // Also sync to user_roles
        const { error: roleError } = await supabase
            .from('user_roles')
            .update({ active: !user.active })
            .eq('user_id', user.managed_user_id || id);

        if (roleError) {
            console.warn('Warning: Could not sync active status to user_roles table:', roleError);
        }

        // Immediate UI update
        setUsers(prev => prev.map(u =>
            u.id === id ? { ...u, active: !u.active } : u
        ));
        toast.success(`User ${!user.active ? 'activated' : 'deactivated'} successfully`);
    };

    // Pricing Operations
    const updatePrices = async (newPrices) => {
        if (!currentUser || !targetUserId) return;
        const priceData = {
            user_id: targetUserId,
            adult_price: newPrices.adult || prices.adult,
            child_price: newPrices.child || prices.child,
            infant_price: newPrices.infant || prices.infant,
            tax: newPrices.tax || prices.tax,
            surcharge: newPrices.surcharge || prices.surcharge,
            updated_by: currentUser.id
        };

        const { error } = await supabase
            .from('settings')
            .upsert(priceData, {
                onConflict: 'user_id'
            });

        if (error) {
            console.error('Error updating prices:', error);
            toast.error(`Failed to update prices: ${error.message || error.code}`);
            throw error;
        }

        // Optimistic update
        setPrices({
            adult: Number(priceData.adult_price),
            child: Number(priceData.child_price),
            infant: Number(priceData.infant_price),
            tax: Number(priceData.tax),
            surcharge: Number(priceData.surcharge)
        });
        toast.success('Prices updated successfully');
    };

    // Role Permissions Operations
    const addRole = async (roleName) => {
        if (!currentUser) return;

        // Default empty permissions
        const defaultPermissions = {
            flight: { create: false, delete: false, delete_own: false, view_own: true, view_any: false },
            passenger: { create: false, delete: false, delete_own: false, view_own: true, view_any: false },
            generating: { batch: false, manifest: false, ticket: false, download: false },
            searching: { past: false, upcoming: false },
            settings: {
                airline_create: false, airline_update: false, airline_delete: false,
                pricing_edit: false,
                agency_create: false, agency_update: false, agency_delete: false,
                user_create: false, user_activate: false, user_deactivate: false
            }
        };

        const { data, error } = await supabase
            .from('role_permissions')
            .insert({ role: roleName, permissions: defaultPermissions })
            .select('*')
            .single();

        if (error) {
            console.error('Error adding role:', error);
            toast.error(`Failed to add role: ${error.message}`);
            throw error;
        }

        setRoleDefinitions(prev => [...prev, data]);
        toast.success(`Role '${roleName}' created`);
        return data;
    };

    const updateRolePermissions = async (roleId, newPermissions) => {
        if (!currentUser) return;

        const { data, error } = await supabase
            .from('role_permissions')
            .update({ permissions: newPermissions })
            .eq('id', roleId)
            .select('*')
            .single();

        if (error) {
            console.error('Error updating permissions:', error);
            toast.error(`Failed to update permissions: ${error.message}`);
            throw error;
        }

        setRoleDefinitions(prev => prev.map(r => r.id === roleId ? data : r));
        toast.success('Role permissions updated');
    };

    const hasPermission = (category, action) => {
        if (userRole === 'Admin') return true;

        const definition = roleDefinitions.find(r => r.role === userRole);
        if (!definition) return false;

        return definition.permissions?.[category]?.[action] || false;
    };

    const resolveUserName = (uuid) => {
        if (!uuid) return 'System';
        if (uuid === currentUser?.id) return 'Me';

        // Check managed users and account users
        const user = users.find(u => u.managed_user_id === uuid || u.id === uuid);
        return user?.name || 'User';
    };

    const updateAgencyBranding = async (name, tagline) => {
        if (!currentUser || !targetUserId) return;

        try {
            const { error } = await supabase
                .from('settings')
                .update({
                    agency_name: name,
                    agency_tagline: tagline,
                    updated_by: currentUser.id,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', targetUserId);

            if (error) throw error;

            setAgencyName(name);
            setAgencyTagline(tagline);
            toast.success('Agency branding updated successfully');

            await logActivity('UPDATE', 'SETTINGS', targetUserId,
                `Updated global agency branding: ${name} - ${tagline}`
            );
        } catch (err) {
            console.error('Error updating agency branding:', err);
            toast.error('Failed to update agency branding');
            throw err;
        }
    };

    return (
        <FlightContext.Provider value={{
            refreshData: loadInitialData,
            flights,
            airlines,
            agencies,
            prices,
            users,
            agencyName,
            agencyTagline,
            updateAgencyBranding,
            loading,
            createFlight,
            updateFlight,
            deleteFlight,
            addPassengerToFlight,
            removePassengerFromFlight,
            getFlight,
            addAirline,
            updateAirline,
            deleteAirline,
            getAirline,
            addAgency,
            updateAgency,
            deleteAgency,
            updatePrices,
            addUser,
            updateUser,
            toggleUserStatus,
            roleDefinitions,
            addRole,
            updateRolePermissions,
            hasPermission,
            resolveUserName,
            targetUserId
        }}>
            {children}
        </FlightContext.Provider>
    );
};

export const useFlights = () => useContext(FlightContext);
