import React from 'react';
import { useState, useEffect } from 'react';
import axios from 'axios';

function HistoryPage() {
  const [calls, setCalls] = useState([]);
  const [selectedCall, setSelectedCall] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCallHistory();
  }, []);

  const fetchCallHistory = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/calls/history`);
      setCalls(response.data.calls);
    } catch (error) {
      console.error('Error fetching call history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Call History</h1>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading call history...</p>
        </div>
      ) : calls.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">No calls in your history yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {calls.map((call) => (
            <div key={call._id} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Call Header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setSelectedCall(selectedCall?._id === call._id ? null : call)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {call.type === 'random' ? 'Random Practice Call' : 'Direct Call'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {new Date(call.startTime).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      Duration: {formatDuration(call.duration)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {call.participants.length} participants
                    </p>
                  </div>
                </div>
              </div>

              {/* Call Details */}
              {selectedCall?._id === call._id && (
                <div className="border-t border-gray-200 p-4">
                  {/* Participants */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Participants</h4>
                    <div className="flex gap-4">
                      {call.participants.map((participant) => (
                        <div key={participant.user._id} className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center mr-2">
                            {participant.user.avatar ? (
                              <img
                                src={participant.user.avatar}
                                alt={participant.user.firstName}
                                className="w-full h-full rounded-full"
                              />
                            ) : (
                              <span className="text-sm text-primary-600">
                                {participant.user.firstName[0]}
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-gray-900">
                            {participant.user.firstName} {participant.user.lastName}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Transcript */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Conversation Transcript</h4>
                    <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                      {call.transcript.map((entry, index) => (
                        <div key={index} className="mb-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-primary-600">
                              {call.participants.find(p => p.user._id === entry.speaker)?.user.firstName}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(entry.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-gray-700">{entry.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Grammar Feedback */}
                  {call.grammarFeedback && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Grammar Feedback</h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-1">Overall Score</p>
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div
                                className="bg-primary-600 h-2.5 rounded-full"
                                style={{ width: `${call.grammarFeedback.overallScore}%` }}
                              ></div>
                            </div>
                            <span className="ml-2 text-sm text-gray-600">
                              {call.grammarFeedback.overallScore}%
                            </span>
                          </div>
                        </div>

                        {call.grammarFeedback.mistakes.length > 0 && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">Corrections</p>
                            <div className="space-y-2">
                              {call.grammarFeedback.mistakes.map((mistake, index) => (
                                <div key={index} className="bg-white rounded p-2 text-sm">
                                  <p className="text-red-600 line-through mb-1">{mistake.original}</p>
                                  <p className="text-green-600 mb-1">{mistake.corrected}</p>
                                  <p className="text-gray-600 text-xs">{mistake.explanation}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {call.grammarFeedback.suggestions.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Suggestions for Improvement</p>
                            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                              {call.grammarFeedback.suggestions.map((suggestion, index) => (
                                <li key={index}>{suggestion}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default HistoryPage;