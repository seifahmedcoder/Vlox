import { initQuickInfo, $ } from "@vlox/utils.js";
import { getPosts, postsState } from "@vlox/posts/main-feed.js";
import "@vlox/users/signup.js";
import "@vlox/users/profile.js";
import "@vlox/posts/create.js";

// Init
$(document).on("keydown", "[role='button']", function (e) {
    if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        this.click();
    }
});

getPosts(postsState.customPostId);
initQuickInfo();