import React from 'react';
import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import axios from 'axios';

function FriendsPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchFriends();
    fetchFriendRequests();
  }, []);

  const fetchFriends = async () => {
    try {
      const token = await getToken();
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/friends`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFriends(response.data.friends);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const fetchFriendRequests = async () => {
    try {
      const token = await getToken();
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/friends/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFriendRequests(response.data.requests);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const token = await getToken();
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/friends/search?q=${encodeURIComponent(searchQuery)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSearchResults(response.data.users);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendFriendRequest = async (userId) => {
    try {
      const token = await getToken();
      await axios.post(`${import.meta.env.VITE_API_URL}/api/friends/requests`, { userId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Update search results to show pending status
      setSearchResults(prev =>
        prev.map(user =>
          user.id === userId ? { ...user, requestSent: true } : user
        )
      );
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const acceptFriendRequest = async (requestId) => {
    try {
      const token = await getToken();
      await axios.post(`${import.meta.env.VITE_API_URL}/api/friends/requests/${requestId}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchFriends();
      fetchFriendRequests();
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  const rejectFriendRequest = async (requestId) => {
    try {
      const token = await getToken();
      await axios.post(`${import.meta.env.VITE_API_URL}/api/friends/requests/${requestId}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchFriendRequests();
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    }
  };

  const removeFriend = async (friendId) => {
    try {
      const token = await getToken();
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/friends/${friendId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchFriends();
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Search Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Find Friends</h2>
        <div className="flex gap-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username or email"
            className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-4 space-y-4">
            {searchResults.map((result) => (
              <div
                key={result.id}
                className="flex items-center justify-between p-4 bg-white rounded-lg shadow"
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mr-4">
                    {result.avatar ? (
                      <img
                        src={result.avatar}
                        alt={result.firstName}
                        className="w-full h-full rounded-full"
                      />
                    ) : (
                      <span className="text-xl text-primary-600">
                        {result.firstName[0]}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {result.firstName} {result.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">{result.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => sendFriendRequest(result.id)}
                  disabled={result.requestSent}
                  className={`px-4 py-2 rounded-lg ${result.requestSent
                    ? 'bg-gray-100 text-gray-500'
                    : 'bg-primary-100 text-primary-600 hover:bg-primary-200'
                    }`}
                >
                  {result.requestSent ? 'Request Sent' : 'Add Friend'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Friend Requests Section */}
      {friendRequests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Friend Requests</h2>
          <div className="space-y-4">
            {friendRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 bg-white rounded-lg shadow"
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mr-4">
                    {request.from.avatar ? (
                      <img
                        src={request.from.avatar}
                        alt={request.from.firstName}
                        className="w-full h-full rounded-full"
                      />
                    ) : (
                      <span className="text-xl text-primary-600">
                        {request.from.firstName[0]}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {request.from.firstName} {request.from.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">{request.from.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => acceptFriendRequest(request.id)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => rejectFriendRequest(request.id)}
                    className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List Section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Friends</h2>
        {friends.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between p-4 bg-white rounded-lg shadow"
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mr-4">
                    {friend.avatar ? (
                      <img
                        src={friend.avatar}
                        alt={friend.firstName}
                        className="w-full h-full rounded-full"
                      />
                    ) : (
                      <span className="text-xl text-primary-600">
                        {friend.firstName[0]}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {friend.firstName} {friend.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {friend.isOnline ? (
                        <span className="text-green-500">Online</span>
                      ) : (
                        <span className="text-gray-500">
                          Last seen {new Date(friend.lastSeen).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => removeFriend(friend.id)}
                    className="px-4 py-2 text-gray-600 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            You haven't added any friends yet. Use the search above to find friends!
          </p>
        )}
      </div>
    </div>
  );
}

export default FriendsPage;