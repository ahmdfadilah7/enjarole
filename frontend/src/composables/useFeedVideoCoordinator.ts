type FeedVideoController = {
  pause: () => void;
};

const controllers = new Map<string, FeedVideoController>();
let activeId: string | null = null;

export function registerFeedVideo(id: string, controller: FeedVideoController) {
  controllers.set(id, controller);
}

export function unregisterFeedVideo(id: string) {
  controllers.delete(id);
  if (activeId === id) activeId = null;
}

export function setActiveFeedVideo(id: string | null) {
  if (activeId === id) return;
  controllers.forEach((controller, controllerId) => {
    if (controllerId !== id) controller.pause();
  });
  activeId = id;
}
