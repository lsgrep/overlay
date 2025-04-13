import { useState, useEffect } from 'react';
import { t } from '@extension/i18n';
import { overlayApi, type CalendarEvent } from '@extension/shared/lib/services/api';
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
  VideoCameraIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { ArrowPathIcon } from '@heroicons/react/24/solid';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, ZoomIcon } from '@extension/ui';

// We no longer need props as we use design tokens
type CalendarViewProps = Record<string, never>;

// Function to format event description with enhanced formatting
const formatEventDescription = (text: string): string => {
  if (!text) return '';

  // Remove non-alphabetical characters from the beginning
  const cleanedText = text.replace(/^[^a-zA-Z]+/, '');

  // For calendar events from Google, we want to preserve the HTML formatting
  // but add some additional styling for better presentation
  return (
    cleanedText
      // Make sure all URLs are properly linked
      .replace(/(?<!(href="|src="))https?:\/\/[^\s<>]+/g, url => {
        // Truncate displayed URL if too long while preserving the full link
        const displayUrl = url.length > 40 ? url.substring(0, 37) + '...' : url;
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 dark:text-indigo-400 hover:underline break-all inline-block max-w-full overflow-hidden" style="word-break: break-word; overflow-wrap: break-word;" title="${url}">${displayUrl}</a>`;
      })

      // Add consistent styling to existing HTML elements
      .replace(/<strong>(.*?)<\/strong>/g, '<strong class="font-bold">$1</strong>')
      .replace(/<b>(.*?)<\/b>/g, '<b class="font-bold">$1</b>')
      .replace(/<em>(.*?)<\/em>/g, '<em class="italic">$1</em>')
      .replace(/<i>(.*?)<\/i>/g, '<i class="italic">$1</i>')

      // Make sure all anchor tags have styling
      .replace(/<a(?!.*class=)/g, '<a class="text-indigo-600 dark:text-indigo-400 hover:underline" ')

      // Add a bit of spacing after paragraphs
      .replace(/<\/p>/g, '</p><div class="h-2"></div>')

      // Add some spacing after line breaks for readability
      .replace(/<br\s*\/?>/g, '<br class="mb-2" />')
      // Add special styles for links to ensure they break properly
      .replace(
        /<a /g,
        '<a style="word-break: break-word; overflow-wrap: break-word; display: inline-block; max-width: 100%;" ',
      )
  );
};

export const CalendarView: React.FC<CalendarViewProps> = () => {
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
        setError(t('calendar_error_loading'));
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

    if (dateStr === today) return t('calendar_today');
    if (dateStr === tomorrowStr) return t('calendar_tomorrow');
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
        <h2 className="text-xl font-semibold text-foreground">{t('calendar_title')}</h2>
        {loading && <ArrowPathIcon className="ml-2 w-4 h-4 animate-spin text-primary" />}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-8 p-8 rounded-lg border border-border bg-card">
        {loading && dateKeys.length === 0 ? (
          <p className="text-center py-4 text-muted-foreground">{t('calendar_loading')}</p>
        ) : dateKeys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6">
            <CalendarIcon className="w-10 h-10 text-muted-foreground/50 mb-2" />
            <p className="text-center text-muted-foreground">{t('calendar_no_events')}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {dateKeys.map(dateKey => (
              <div key={dateKey} className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
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
                      ? t('calendar_all_day')
                      : `${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

                    return (
                      <div
                        key={event.id}
                        className={`p-3 rounded-lg border bg-card hover:shadow-md transition-all duration-200 cursor-pointer ${
                          isPastEvent ? 'border-border/50' : isOngoing ? 'border-success/50' : 'border-primary/30'
                        }`}
                        onClick={() => {
                          setSelectedEvent(event);
                          setEventDetailsOpen(true);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setSelectedEvent(event);
                            setEventDetailsOpen(true);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`View details for ${event.summary}`}>
                        <div className="flex flex-col">
                          <div className="flex justify-between">
                            <p className="font-medium text-foreground">{event.summary}</p>
                            <div
                              className={`flex items-center text-xs ${
                                isPastEvent ? 'text-muted-foreground' : isOngoing ? 'text-success' : 'text-primary'
                              }`}>
                              <ClockIcon className="w-3 h-3 mr-1" />
                              <span>{formattedTime}</span>
                            </div>
                          </div>

                          {/* Event details */}
                          <div className="mt-1 space-y-1">
                            {event.location && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                {event.location.includes('zoom.us') ? (
                                  <a
                                    href={event.location}
                                    onClick={e => e.stopPropagation()}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium hover:underline max-w-full overflow-hidden">
                                    <ZoomIcon className="w-3 h-3 flex-shrink-0 text-indigo-600 dark:text-indigo-400" />
                                    <span className="truncate">Zoom Meeting</span>
                                  </a>
                                ) : (
                                  <>
                                    <MapPinIcon className="w-3 h-3" />
                                    <span className="truncate">{event.location}</span>
                                  </>
                                )}
                              </div>
                            )}

                            {/* Display conference links with proper grouping */}
                            {(() => {
                              // Only show one type of conference link - prioritize conferenceData
                              if (event.conferenceData?.entryPoints && event.conferenceData.entryPoints.length > 0) {
                                // Group entry points by type
                                const meetEntryPoint = event.conferenceData.entryPoints.find(entry =>
                                  entry.uri?.includes('meet.google.com'),
                                );
                                const zoomEntryPoint = event.conferenceData.entryPoints.find(entry =>
                                  entry.uri?.includes('zoom'),
                                );
                                const otherEntryPoint =
                                  !meetEntryPoint && !zoomEntryPoint ? event.conferenceData.entryPoints[0] : null;

                                return (
                                  <div className="flex flex-col gap-1 text-xs mt-1">
                                    {meetEntryPoint && (
                                      <a
                                        href={meetEntryPoint.uri}
                                        onClick={e => e.stopPropagation()}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium hover:underline inline-flex items-center max-w-full overflow-hidden">
                                        <VideoCameraIcon className="inline-block w-3 h-3 mr-1 flex-shrink-0 text-blue-500" />
                                        <span className="truncate">Google Meet</span>
                                      </a>
                                    )}
                                    {zoomEntryPoint && (
                                      <a
                                        href={zoomEntryPoint.uri}
                                        onClick={e => e.stopPropagation()}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium hover:underline inline-flex items-center max-w-full overflow-hidden">
                                        <ZoomIcon className="inline-block w-3 h-3 mr-1 flex-shrink-0 text-indigo-600 dark:text-indigo-400" />
                                        <span className="truncate">Zoom Meeting</span>
                                      </a>
                                    )}
                                    {otherEntryPoint && (
                                      <a
                                        href={otherEntryPoint.uri}
                                        onClick={e => e.stopPropagation()}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium hover:underline inline-flex items-center max-w-full overflow-hidden">
                                        <VideoCameraIcon className="inline-block w-3 h-3 mr-1 flex-shrink-0" />
                                        <span className="truncate">Conference</span>
                                      </a>
                                    )}
                                  </div>
                                );
                              } else if (
                                event.description?.includes('zoom.us') ||
                                event.location?.includes('zoom.us')
                              ) {
                                // Handle Zoom links from description or location as fallback
                                return (
                                  <div className="flex items-center gap-2 text-xs mt-1">
                                    <a
                                      href={
                                        event.location?.includes('zoom.us')
                                          ? event.location
                                          : event.description?.match(/https:\/\/[^\s<>]*zoom.us[^\s<>]*/)?.[0]
                                      }
                                      onClick={e => e.stopPropagation()}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium hover:underline inline-flex items-center">
                                      <ZoomIcon className="w-3 h-3 mr-1 text-indigo-600 dark:text-indigo-400" />
                                      <span>Zoom Meeting</span>
                                    </a>
                                  </div>
                                );
                              }

                              return null;
                            })()}

                            {event.attendees && event.attendees.length > 0 && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <UsersIcon className="w-3 h-3" />
                                <span>
                                  {event.attendees.length === 1
                                    ? `${event.attendees.length} ${t('calendar_attendee')}`
                                    : `${event.attendees.length} ${t('calendar_attendees')}`}
                                </span>
                              </div>
                            )}

                            {/* Only show description if it doesn't just contain meeting info */}
                            {event.description &&
                              !event.description.includes('is inviting you to a scheduled Zoom meeting') &&
                              !event.description.includes('Join Zoom Meeting') && (
                                <p
                                  className="text-xs mt-1 truncate text-muted-foreground"
                                  title={event.description.replace(/<[^>]*>?/gm, '')}>
                                  {event.description
                                    .replace(/<[^>]*>?/gm, '')
                                    .replace(/^[^a-zA-Z]+/, '')
                                    .substring(0, 50)}
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
        <DialogContent className="sm:max-w-md bg-background border border-border text-foreground">
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10 bg-background">
            <XMarkIcon className="h-4 w-4 text-foreground" />
            <span className="sr-only">{t('calendar_close')}</span>
          </DialogClose>
          <DialogHeader>
            <DialogTitle className="pr-10 text-foreground">{selectedEvent?.summary}</DialogTitle>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4 py-2">
              {/* Date and Time */}
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <ClockIcon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground">{t('calendar_date_time')}</h4>
                  <div className="mt-1 text-sm text-foreground">
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
                            <div className="text-foreground">{startDate}</div>
                            <div className="text-muted-foreground">
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
                        // For all-day events, we don't need to explicitly store the endDate string as we calculate it when needed
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
                            <div className="text-foreground">
                              {startDate === formattedAdjustedEndDate
                                ? startDate
                                : `${startDate} - ${formattedAdjustedEndDate}`}
                            </div>
                            <div className="text-muted-foreground">{t('calendar_all_day')}</div>
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
                  <div className="p-2 rounded-full bg-primary/10">
                    {selectedEvent.location.includes('zoom.us') ? (
                      <ZoomIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <MapPinIcon className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground">
                      {selectedEvent.location.includes('zoom.us') ? 'Zoom Meeting' : t('calendar_location')}
                    </h4>
                    <p className="mt-1 text-sm break-words text-foreground">
                      {selectedEvent.location.startsWith('http') ? (
                        <a
                          href={selectedEvent.location}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline break-all inline-block max-w-full">
                          {selectedEvent.location.includes('zoom.us') ? (
                            'Join Zoom Meeting'
                          ) : (
                            <span className="truncate inline-block max-w-full">{selectedEvent.location}</span>
                          )}
                        </a>
                      ) : (
                        selectedEvent.location
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Conference Links */}
              {selectedEvent.conferenceData?.entryPoints && selectedEvent.conferenceData.entryPoints.length > 0 && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                    <VideoCameraIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground">
                      {selectedEvent.conferenceData.conferenceSolution?.name || 'Conference'}
                    </h4>
                    <div className="mt-1 text-sm space-y-2">
                      {selectedEvent.conferenceData.entryPoints.map((entry, idx) => (
                        <div key={idx}>
                          <a
                            href={entry.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline font-medium">
                            {entry.label || 'Join ' + (entry.entryPointType || 'meeting')}
                          </a>
                          {entry.entryPointType === 'phone' && entry.pin && (
                            <span className="ml-2 text-xs text-muted-foreground">PIN: {entry.pin}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Attendees */}
              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <UsersIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground">
                      {t('calendar_attendees')} ({selectedEvent.attendees.length})
                    </h4>
                    <ul className="mt-1 text-sm space-y-1 max-h-32 overflow-y-auto">
                      {selectedEvent.attendees.map((attendee, index) => (
                        <li key={index} className="text-muted-foreground">
                          {attendee.displayName || attendee.email}
                          {attendee.responseStatus === 'accepted' && (
                            <span className="ml-1 text-success text-xs">{t('calendar_status_accepted')}</span>
                          )}
                          {attendee.responseStatus === 'tentative' && (
                            <span className="ml-1 text-warning text-xs">{t('calendar_status_tentative')}</span>
                          )}
                          {attendee.responseStatus === 'declined' && (
                            <span className="ml-1 text-destructive text-xs">{t('calendar_status_declined')}</span>
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
                  <div className="p-2 rounded-full bg-primary/10">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground">Description</h4>
                    <div className="mt-1 max-h-60 overflow-y-auto">
                      {/* Format and render description with enhanced formatting */}
                      <div
                        className="event-description text-sm leading-relaxed text-foreground break-words"
                        style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
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
