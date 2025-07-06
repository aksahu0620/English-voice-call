import React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useSocket } from '../context/SocketContext';

function Dashboard() {
  console.log('Dashboard rendered');
  const { user } = useUser();
  const navigate = useNavigate();
  const { socket, isConnected, connectionError, joinRandomQueue } = useSocket();
  const [isWaiting, setIsWaiting] = useState(false);
  const [onlineFriends, setOnlineFriends] = useState([]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleWaitingForMatch = () => {
      setIsWaiting(true);
    };

    const handleCallMatched = (data) => {
      setIsWaiting(false);
      navigate(`/call/${data.callId}`, { state: data });
    };

    const handleFriendsStatusUpdate = (data) => {
      setOnlineFriends(data.onlineFriends);
    };

    const handleSocketError = (error) => {
      setIsWaiting(false);
      alert(error?.message || 'An error occurred while starting a random call.');
    };

    // Register event listeners
    socket.on('waiting_for_match', handleWaitingForMatch);
    socket.on('call_matched', handleCallMatched);
    socket.on('friends_status_update', handleFriendsStatusUpdate);
    socket.on('error', handleSocketError);

    // Request online friends list
    socket.emit('get_online_friends');

    return () => {
      socket.off('waiting_for_match', handleWaitingForMatch);
      socket.off('call_matched', handleCallMatched);
      socket.off('friends_status_update', handleFriendsStatusUpdate);
      socket.off('error', handleSocketError);
    };
  }, [socket, isConnected, navigate]);

  const handleRandomCall = () => {
    console.log('Random Call button clicked');
    if (!isConnected) {
      console.log('Socket not connected');
      alert('Not connected to server. Please check your connection and try again.');
      return;
    }
    console.log('Calling joinRandomQueue');
    joinRandomQueue();
  };

  const handleDirectCall = (friendId) => {
    if (!isConnected) return;
    socket.emit('initiate_direct_call', { friendId });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Connection Status */}
      <div className="mb-4 p-4 rounded-lg">
        {isConnected ? (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            Connected to server
          </div>
        ) : (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Not connected to server
            {connectionError && (
              <div className="text-sm mt-1">
                Error: {connectionError}
              </div>
            )}
            <div className="mt-2 space-y-2">
              <button
                onClick={() => {
                  console.log('Testing connection to:', import.meta.env.VITE_SERVER_URL);
                  fetch(`${import.meta.env.VITE_SERVER_URL}/health`)
                    .then(response => response.json())
                    .then(data => {
                      console.log('Health check response:', data);
                      alert(`Backend is reachable! Status: ${data.status}`);
                    })
                    .catch(error => {
                      console.error('Health check failed:', error);
                      alert(`Backend not reachable: ${error.message}`);
                    });
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm mr-2"
              >
                Test Backend Connection
              </button>
              <button
                onClick={() => {
                  fetch(`${import.meta.env.VITE_SERVER_URL}/socket-test`)
                    .then(response => response.json())
                    .then(data => {
                      console.log('Socket test response:', data);
                      alert(`Socket.io ready! Active connections: ${data.activeConnections}`);
                    })
                    .catch(error => {
                      console.error('Socket test failed:', error);
                      alert(`Socket.io not ready: ${error.message}`);
                    });
                }}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm"
              >
                Test Socket.io
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Welcome Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome, {user.firstName}!
        </h1>
        <p className="text-lg text-gray-600">
          Practice your English speaking skills with native speakers or other learners.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {/* Random Call Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Random Practice
          </h2>
          <p className="text-gray-600 mb-6">
            Connect with a random user and start practicing immediately.
          </p>
          <button
            onClick={handleRandomCall}
            disabled={isWaiting || !isConnected}
            className={`w-full py-3 px-6 rounded-lg text-white font-medium
              ${isWaiting
                ? 'bg-gray-400 cursor-not-allowed'
                : !isConnected
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700'}`}
          >
            {isWaiting ? 'Finding a partner...' : 'Start Random Call'}
          </button>
        </div>

        {/* Friends Call Card */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">
            Call a Friend
          </h2>
          {onlineFriends.length > 0 ? (
            <div className="space-y-4">
              {onlineFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                      {friend.avatar ? (
                        <img
                          src={friend.avatar}
                          alt={friend.name}
                          className="w-full h-full rounded-full"
                        />
                      ) : (
                        <span className="text-xl text-primary-600">
                          {friend.firstName[0]}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-800">
                        {friend.firstName} {friend.lastName}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {friend.speakingLevel}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDirectCall(friend.id)}
                    className="bg-primary-100 text-primary-600 hover:bg-primary-200 px-4 py-2 rounded-lg font-medium"
                  >
                    Call
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">
                No friends online at the moment.
              </p>
              <button
                onClick={() => navigate('/friends')}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Find Friends
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
          Your Progress
        </h2>
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-3xl font-bold text-primary-600 mb-2">0</p>
            <p className="text-gray-600">Calls Made</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-primary-600 mb-2">0 min</p>
            <p className="text-gray-600">Total Practice Time</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-primary-600 mb-2">{user.speakingLevel || 'Beginner'}</p>
            <p className="text-gray-600">Current Level</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;