import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import '../styles/App.css';

const Home = () => {
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState([]);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [isPointConfirmOpen, setIsPointConfirmOpen] = useState(false);
  const [pendingPointUpdate, setPendingPointUpdate] = useState(null);
  const [isPasswordConfirmOpen, setIsPasswordConfirmOpen] = useState(false);
  const [pendingPasswordUpdate, setPendingPasswordUpdate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    jenis_kendaraan: '',
    no_polisi: '',
    email_address: '',
    password:'',
    image_url: '',
    order_count: 0
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchDrivers();

    const channel = supabase
      .channel('custom-all-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'drivers' },
        (payload) => {
          console.log('Change received!', payload);
          fetchDrivers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDrivers(data || []);
    } catch (error) {
      setError(error.message);
      console.error('Error fetching drivers:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCellEdit = (driver, field, value) => {
    if (field === 'order_count') {
      setPendingPointUpdate({
        driverId: driver.id,
        oldValue: driver.order_count || 0,
        newValue: parseInt(value),
        driverName: driver.name
      });
      setIsPointConfirmOpen(true);
    } else if (field === 'password') {
      setPendingPasswordUpdate({
        driverId: driver.id,
        oldValue: driver.password || '',
        newValue: value,
        driverName: driver.name
      });
      setIsPasswordConfirmOpen(true);
    }
    setEditingCell({ driverId: driver.id, field: null });
  };

  const handleConfirmPointUpdate = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('drivers')
        .update({ order_count: pendingPointUpdate.newValue })
        .eq('id', pendingPointUpdate.driverId);

      if (error) throw error;

      setIsPointConfirmOpen(false);
      setPendingPointUpdate(null);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPointUpdate = () => {
    setIsPointConfirmOpen(false);
    setPendingPointUpdate(null);
    fetchDrivers(); // Refresh data to revert changes
  };

  const handleConfirmPasswordUpdate = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('drivers')
        .update({ password: pendingPasswordUpdate.newValue })
        .eq('id', pendingPasswordUpdate.driverId);

      if (error) throw error;

      setIsPasswordConfirmOpen(false);
      setPendingPasswordUpdate(null);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPasswordUpdate = () => {
    setIsPasswordConfirmOpen(false);
    setPendingPasswordUpdate(null);
    fetchDrivers();
  };

  const handleAddDriver = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { error } = await supabase
        .from('drivers')
        .insert([formData]);

      if (error) throw error;

      setFormData({
        name: '',
        phone_number: '',
        jenis_kendaraan: '',
        no_polisi: '',
        email_address: '',
        password:'',
        image_url: '',
        order_count: 0
      });
      setIsModalOpen(false);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (driver) => {
    setEditingDriver(driver);
    setFormData({
      ...driver,
      // Hanya mengambil password dan order_count untuk diedit
      password: driver.password || '',
      order_count: driver.order_count || 0
    });
    setIsModalOpen(true);
  };

  const handleUpdateDriver = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { error } = await supabase
        .from('drivers')
        .update({
          // Hanya update password dan order_count
          password: formData.password,
          order_count: formData.order_count
        })
        .eq('id', editingDriver.id);

      if (error) throw error;

      setFormData({
        name: '',
        phone_number: '',
        jenis_kendaraan: '',
        no_polisi: '',
        email_address: '',
        password:'',
        image_url: '',
        order_count: 0
      });
      setEditingDriver(null);
      setIsModalOpen(false);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDriver = async (id) => {
    if (window.confirm('Are you sure you want to delete this driver?')) {
      try {
        setLoading(true);
        const { error } = await supabase
          .from('drivers')
          .delete()
          .eq('id', id);

        if (error) throw error;
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error.message);
    }
  };

  const EditableCell = ({ value, driver, field, type = 'text' }) => {
    const isEditing = editingCell?.driverId === driver.id && editingCell?.field === field;
    const [editValue, setEditValue] = useState(value);
    const [showPassword, setShowPassword] = useState(false);

    if (isEditing) {
      return (
        <div className="password-input-container">
          <input
            type={field === 'password' ? (showPassword ? 'text' : 'password') : type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => handleCellEdit(driver, field, editValue)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleCellEdit(driver, field, editValue);
              }
            }}
            className="inline-edit-input"
            autoFocus
          />
          {field === 'password' && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="toggle-password"
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          )}
        </div>
      );
    }

    return (
      <div
        className="editable-cell"
        onClick={() => setEditingCell({ driverId: driver.id, field })}
      >
        {field === 'password' ? '••••••' : value}
      </div>
    );
  };

  if (loading) {
    return <div className="loading">Loading drivers data...</div>;
  }

  return (
    <div className="home-container">
      <header className="home-header">
        <h1>OPA Driver Management</h1>
        <div className="header-actions">
          <button
            onClick={fetchDrivers}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
          <button onClick={() => {
            setEditingDriver(null);
            setFormData({
              name: '',
              phone_number: '',
              jenis_kendaraan: '',
              no_polisi: '',
              email_address: '',
              password:'',
              image_url: '',
              order_count: 0
            });
            setIsModalOpen(true);
          }} className="add-button">
            Add New Driver
          </button>
          <button onClick={handleSignOut} className="sign-out-button">
            Sign Out
          </button>
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}

      <div className="table-container">
        {drivers.length === 0 ? (
          <p className="no-data">No drivers found</p>
        ) : (
          <table className="drivers-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Photo</th>
                <th>Name</th>
                <th>Email</th>
                <th>No Handphone</th>
                <th>Jenis Kendaraan</th>
                <th>No Polisi</th>
                <th>Password</th>
                <th>Jumlah Order</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver, index) => (
                <tr key={driver.id}>
                  <td className="number-cell">{index + 1}</td>
                  <td className="image-cell">
                    <img 
                      src={driver.image_url} 
                      alt={driver.name}
                      className="driver-thumbnail"
                    />
                  </td>
                  <td>{driver.name}</td>
                  <td>{driver.email_address}</td>
                  <td>{driver.phone_number}</td>
                  <td>{driver.jenis_kendaraan}</td>
                  <td>{driver.no_polisi}</td>
                  <td className="password-cell">
                    <EditableCell
                      value={driver.password || ''}
                      driver={driver}
                      field="password"
                      type="password"
                    />
                  </td>
                  <td className="point-cell">
                    <EditableCell
                      value={driver.order_count || 0}
                      driver={driver}
                      field="order_count"
                      type="number"
                    />
                  </td>
                  <td className="action-cell">
                    <button 
                      onClick={() => handleEditClick(driver)}
                      className="edit-button"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteDriver(driver.id)}
                      className="delete-button"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{editingDriver ? `Edit Driver: ${editingDriver.name}` : 'Add New Driver'}</h2>
            <form onSubmit={editingDriver ? handleUpdateDriver : handleAddDriver}>
              <div className="form-group">
                <label>Password:</label>
                <div className="password-input-container">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="toggle-password"
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Order Count:</label>
                <input
                  type="number"
                  name="order_count"
                  value={formData.order_count}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="submit" disabled={loading}>
                  {loading ? (editingDriver ? 'Updating...' : 'Adding...') : (editingDriver ? 'Update Driver' : 'Add Driver')}
                </button>
                <button type="button" onClick={() => {
                  setIsModalOpen(false);
                  setEditingDriver(null);
                }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPointConfirmOpen && pendingPointUpdate && (
        <div className="modal-overlay">
          <div className="modal point-confirm-modal">
            <h2>Confirm Order Count Update</h2>
            <p>
              Are you sure you want to update the order count for driver <strong>{pendingPointUpdate.driverName}</strong>?
            </p>
            <div className="point-change-details">
              <div>Old Order Count: <span className="old-point">{pendingPointUpdate.oldValue}</span></div>
              <div>New Order Count: <span className="new-point">{pendingPointUpdate.newValue}</span></div>
            </div>
            <div className="modal-actions">
              <button 
                onClick={handleConfirmPointUpdate}
                className="submit-button"
              >
                Confirm Update
              </button>
              <button 
                onClick={handleCancelPointUpdate}
                className="cancel-button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isPasswordConfirmOpen && pendingPasswordUpdate && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Update Password</h2>
            <p>Are you sure you want to update the password for {pendingPasswordUpdate.driverName}?</p>
            <p>New Password: {pendingPasswordUpdate.newValue}</p>
            <div className="modal-actions">
              <button onClick={handleConfirmPasswordUpdate}>Confirm</button>
              <button onClick={handleCancelPasswordUpdate}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
