import { useState, useEffect } from 'react';
import { overlayApi, type CalendarEvent } from '@extension/shared/lib/services/api';
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
  XMarkIcon,
  LinkIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { ArrowPathIcon } from '@heroicons/react/24/solid';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, Button } from '@extension/ui';

interface CalendarViewProps {
  isLight: boolean;
}

// Function to format event description with enhanced formatting
const formatEventDescription = (text: string): string => {
  if (!text) return '';

  // For calendar events from Google, we want to preserve the HTML formatting
  // but add some additional styling for better presentation
  return (
    text
      // Make sure all URLs are properly linked
      .replace(/(?<!(href="|src="))https?:\/\/[^\s<>]+/g, url => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">${url}</a>`;
      })

      // Add consistent styling to existing HTML elements
      .replace(/<strong>(.*?)<\/strong>/g, '<strong class="font-bold">$1</strong>')
      .replace(/<b>(.*?)<\/b>/g, '<b class="font-bold">$1</b>')
      .replace(/<em>(.*?)<\/em>/g, '<em class="italic">$1</em>')
      .replace(/<i>(.*?)<\/i>/g, '<i class="italic">$1</i>')

      // Make sure all anchor tags have styling
      .replace(/<a(?!.*class=)/g, '<a class="text-blue-500 hover:underline" ')

      // Add a bit of spacing after paragraphs
      .replace(/<\/p>/g, '</p><div class="h-2"></div>')

      // Add some spacing after line breaks for readability
      .replace(/<br\s*\/?>/g, '<br class="mb-2" />')
  );
};

export const CalendarView: React.FC<CalendarViewProps> = ({ isLight }) => {
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [eventDetailsOpen, setEventDetailsOpen] = useState<boolean>(false);

  // Fetch upcoming calendar events
  useEffect(() => {
    const fetchCalendarEvents = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch calendar events
        const events = await overlayApi.getUpcomingEvents(7);
        setUpcomingEvents(events);
      } catch (err) {
        setError('Failed to load calendar events. Please try again.');
        console.error('Error fetching calendar events:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarEvents();
  }, []);

  // Determine if a date is today, tomorrow, or a future date
  const getDateLabel = (dateStr: string) => {
    const today = new Date().toLocaleDateString();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toLocaleDateString();

    if (dateStr === today) return 'Today';
    if (dateStr === tomorrowStr) return 'Tomorrow';
    return dateStr;
  };

  // Group events by date
  const getGroupedEvents = () => {
    const groupedEvents: { [key: string]: CalendarEvent[] } = {};

    upcomingEvents.forEach(event => {
      // Use event start date for grouping
      const startDate = event.start.dateTime
        ? new Date(event.start.dateTime)
        : event.start.date
          ? new Date(event.start.date)
          : null;

      if (!startDate) return;

      const dateKey = startDate.toLocaleDateString();

      if (!groupedEvents[dateKey]) {
        groupedEvents[dateKey] = [];
      }

      groupedEvents[dateKey].push(event);
    });

    // Sort each day's events by time
    Object.keys(groupedEvents).forEach(dateKey => {
      groupedEvents[dateKey].sort((a, b) => {
        const timeA = a.start.dateTime ? new Date(a.start.dateTime).getTime() : 0;
        const timeB = b.start.dateTime ? new Date(b.start.dateTime).getTime() : 0;
        return timeA - timeB;
      });
    });

    return groupedEvents;
  };

  const groupedEvents = getGroupedEvents();
  const dateKeys = Object.keys(groupedEvents).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  return (
    <div className="w-full relative z-10">
      <div className="flex items-center mb-6">
        <h2 className="text-xl font-semibold">Calendar</h2>
        {loading && <ArrowPathIcon className="ml-2 w-4 h-4 animate-spin text-blue-400" />}
      </div>

      {error && (
        <div
          className={`mb-4 p-3 rounded-lg border ${isLight ? 'bg-red-50 border-red-200 text-red-700' : 'bg-red-900/10 border-red-800/30 text-red-400'}`}>
          {error}
        </div>
      )}

      <div
        className={`space-y-8 p-8 rounded-lg border ${isLight ? 'bg-white border-black/10' : 'bg-black border-white/10'}`}>
        {loading && dateKeys.length === 0 ? (
          <p className={`text-center py-4 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
            Loading calendar events...
          </p>
        ) : dateKeys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6">
            <CalendarIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-2" />
            <p className={`text-center ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>No upcoming events</p>
          </div>
        ) : (
          <div className="space-y-6">
            {dateKeys.map(dateKey => (
              <div key={dateKey} className="space-y-2">
                <h3
                  className={`text-sm font-semibold ${isLight ? 'text-gray-600' : 'text-gray-400'} flex items-center gap-2`}>
                  <CalendarIcon className="w-4 h-4" />
                  {getDateLabel(dateKey)}
                </h3>
                <div className="space-y-2">
                  {groupedEvents[dateKey].map(event => {
                    const startTime = event.start?.dateTime
                      ? new Date(event.start.dateTime)
                      : new Date(event.start.date!);
                    const endTime = event.end?.dateTime ? new Date(event.end.dateTime) : new Date(event.end.date!);
                    const isAllDay = !event.start?.dateTime;
                    const isPastEvent = startTime < new Date() && endTime < new Date();
                    const isOngoing = startTime < new Date() && endTime > new Date();

                    const formattedTime = isAllDay
                      ? 'All day'
                      : `${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

                    return (
                      <div
                        key={event.id}
                        className={`p-3 rounded-lg border ${
                          isLight
                            ? `bg-white ${isPastEvent ? 'border-gray-200' : isOngoing ? 'border-green-200' : 'border-blue-200'}`
                            : `bg-gray-900/40 ${isPastEvent ? 'border-gray-800/30' : isOngoing ? 'border-green-800/50' : 'border-blue-800/50'}`
                        } hover:shadow-md transition-all duration-200 cursor-pointer`}
                        onClick={() => {
                          setSelectedEvent(event);
                          setEventDetailsOpen(true);
                        }}>
                        <div className="flex flex-col">
                          <div className="flex justify-between">
                            <p className={`font-medium ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
                              {event.summary}
                            </p>
                            <div
                              className={`flex items-center text-xs ${
                                isPastEvent
                                  ? isLight
                                    ? 'text-gray-500'
                                    : 'text-gray-400'
                                  : isOngoing
                                    ? 'text-green-600'
                                    : isLight
                                      ? 'text-blue-500'
                                      : 'text-blue-400'
                              }`}>
                              <ClockIcon className="w-3 h-3 mr-1" />
                              <span>{formattedTime}</span>
                            </div>
                          </div>

                          {/* Event details */}
                          <div className="mt-1 space-y-1">
                            {event.location && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                <MapPinIcon className="w-3 h-3" />
                                <span className="truncate">{event.location}</span>
                              </div>
                            )}

                            {event.attendees && event.attendees.length > 0 && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                <UsersIcon className="w-3 h-3" />
                                <span>
                                  {event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}
                                </span>
                              </div>
                            )}

                            {event.description && (
                              <p
                                className={`text-xs mt-1 truncate ${isLight ? 'text-gray-600' : 'text-gray-400'}`}
                                title={event.description.replace(/<[^>]*>?/gm, '')}>
                                {event.description.replace(/<[^>]*>?/gm, '').substring(0, 50)}
                                {event.description.replace(/<[^>]*>?/gm, '').length > 50 ? '...' : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Event Details Dialog */}
      <Dialog open={eventDetailsOpen} onOpenChange={setEventDetailsOpen}>
        <DialogContent
          className={`sm:max-w-md ${isLight ? 'bg-white border border-black/10' : 'bg-black border border-white/10'}`}>
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10">
            <XMarkIcon className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <DialogHeader>
            <DialogTitle className="pr-10">{selectedEvent?.summary}</DialogTitle>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4 py-2">
              {/* Date and Time */}
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full ${isLight ? 'bg-blue-100' : 'bg-blue-900/30'}`}>
                  <ClockIcon className={`h-4 w-4 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
                </div>
                <div>
                  <h4 className="text-sm font-medium">Date & Time</h4>
                  <div className="mt-1 text-sm">
                    {(() => {
                      const start = selectedEvent.start?.dateTime
                        ? new Date(selectedEvent.start.dateTime)
                        : new Date(selectedEvent.start.date!);
                      const end = selectedEvent.end?.dateTime
                        ? new Date(selectedEvent.end.dateTime)
                        : new Date(selectedEvent.end.date!);

                      if (selectedEvent.start?.dateTime) {
                        // Event with specific time
                        const startDate = start.toLocaleDateString(undefined, {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        });
                        const startTime = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const endTime = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        return (
                          <>
                            <div>{startDate}</div>
                            <div className={`${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                              {startTime} - {endTime}
                            </div>
                          </>
                        );
                      } else {
                        // All-day event
                        const startDate = start.toLocaleDateString(undefined, {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        });
                        const endDate = end.toLocaleDateString(undefined, {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        });

                        // End date for all-day events is usually the day after (exclusive end date)
                        const adjustedEndDate = new Date(end);
                        adjustedEndDate.setDate(adjustedEndDate.getDate() - 1);
                        const formattedAdjustedEndDate = adjustedEndDate.toLocaleDateString(undefined, {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        });

                        return (
                          <>
                            <div>
                              {startDate === formattedAdjustedEndDate
                                ? startDate
                                : `${startDate} - ${formattedAdjustedEndDate}`}
                            </div>
                            <div className={`${isLight ? 'text-gray-600' : 'text-gray-400'}`}>All day</div>
                          </>
                        );
                      }
                    })()}
                  </div>
                </div>
              </div>

              {/* Location */}
              {selectedEvent.location && (
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${isLight ? 'bg-blue-100' : 'bg-blue-900/30'}`}>
                    <MapPinIcon className={`h-4 w-4 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Location</h4>
                    <p className="mt-1 text-sm break-words">{selectedEvent.location}</p>
                  </div>
                </div>
              )}

              {/* Attendees */}
              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${isLight ? 'bg-blue-100' : 'bg-blue-900/30'}`}>
                    <UsersIcon className={`h-4 w-4 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Attendees ({selectedEvent.attendees.length})</h4>
                    <ul className="mt-1 text-sm space-y-1 max-h-32 overflow-y-auto">
                      {selectedEvent.attendees.map((attendee, index) => (
                        <li key={index} className={`${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                          {attendee.displayName || attendee.email}
                          {attendee.responseStatus === 'accepted' && (
                            <span className="ml-1 text-emerald-600 text-xs">(Accepted)</span>
                          )}
                          {attendee.responseStatus === 'tentative' && (
                            <span className="ml-1 text-amber-600 text-xs">(Tentative)</span>
                          )}
                          {attendee.responseStatus === 'declined' && (
                            <span className="ml-1 text-rose-600 text-xs">(Declined)</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedEvent.description && (
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${isLight ? 'bg-blue-100' : 'bg-blue-900/30'}`}>
                    <CalendarIcon className={`h-4 w-4 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Description</h4>
                    <div className="mt-1 max-h-60 overflow-y-auto">
                      {/* Format and render description with enhanced formatting */}
                      <div
                        className={`event-description text-sm leading-relaxed ${isLight ? 'text-gray-700' : 'text-gray-300'}`}
                        dangerouslySetInnerHTML={{
                          __html: formatEventDescription(selectedEvent.description),
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarView;
