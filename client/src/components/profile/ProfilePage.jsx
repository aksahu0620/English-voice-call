import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import axios from 'axios';

function ProfilePage() {
  const { user } = useUser();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    speakingLevel: '',
    bio: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setIsLoading(true);
      const [profileRes, statsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/api/users/me`),
        axios.get(`${import.meta.env.VITE_API_URL}/api/users/me/stats`)
      ]);

      setProfile(profileRes.data.user);
      setStats(statsRes.data.stats);
      setFormData({
        username: profileRes.data.user.username,
        speakingLevel: profileRes.data.user.speakingLevel,
        bio: profileRes.data.user.bio
      });
    } catch (err) {
      setError('Failed to load profile data');
      console.error('Error fetching profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/users/me`,
        formData
      );
      setProfile(prev => ({
        ...prev,
        ...response.data.user
      }));
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
      console.error('Error updating profile:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex items-center">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-primary-100 flex items-center justify-center">
              {user.imageUrl ? (
                <img src={user.imageUrl} alt={user.fullName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl text-primary-600">{user.firstName?.[0]}</span>
              )}
            </div>
            <div className="ml-6">
              <h1 className="text-2xl font-bold text-gray-900">{user.fullName}</h1>
              <p className="text-gray-600">{profile.username}</p>
              <div className="mt-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                  {profile.speakingLevel.charAt(0).toUpperCase() + profile.speakingLevel.slice(1)} Speaker
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="ml-auto px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit} className="mt-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label htmlFor="speakingLevel" className="block text-sm font-medium text-gray-700">
                    Speaking Level
                  </label>
                  <select
                    id="speakingLevel"
                    name="speakingLevel"
                    value={formData.speakingLevel}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="native">Native</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    rows="3"
                    value={formData.bio}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700">Bio</h3>
              <p className="mt-2 text-gray-600">{profile.bio || 'No bio added yet.'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-primary-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Calls</p>
              <p className="text-2xl font-bold text-primary-600">{stats.totalCalls}</p>
            </div>
            <div className="p-4 bg-primary-50 rounded-lg">
              <p className="text-sm text-gray-600">Minutes Practiced</p>
              <p className="text-2xl font-bold text-primary-600">{stats.totalMinutes}</p>
            </div>
            <div className="p-4 bg-primary-50 rounded-lg">
              <p className="text-sm text-gray-600">Average Score</p>
              <p className="text-2xl font-bold text-primary-600">{stats.averageScore}%</p>
            </div>
            <div className="p-4 bg-primary-50 rounded-lg">
              <p className="text-sm text-gray-600">Friends</p>
              <p className="text-2xl font-bold text-primary-600">{stats.friendCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
          {stats.recentCalls.length === 0 ? (
            <p className="text-gray-600">No recent calls.</p>
          ) : (
            <div className="space-y-4">
              {stats.recentCalls.map(call => (
                <div key={call.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                      {call.partner?.avatar ? (
                        <img
                          src={call.partner.avatar}
                          alt={call.partner.firstName}
                          className="w-full h-full rounded-full"
                        />
                      ) : (
                        <span className="text-sm text-primary-600">
                          {call.partner?.firstName[0]}
                        </span>
                      )}
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">
                        Call with {call.partner?.firstName} {call.partner?.lastName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(call.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, '0')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {call.type === 'random' ? 'Random Match' : 'Direct Call'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;