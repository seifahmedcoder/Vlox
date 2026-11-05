import showProfile from "@vlox/users/profile.js";
import showComments from "@vlox/posts/comments.js";
import CommentEditor from "@vlox/posts/comment-editor.js";
import {
    sendRequest,
    capitalize,
    renderSafeHtml,
    generatePostLink,
    lockEvent,
    copy,
    $,
    Alert
} from "@vlox/utils.js";

const query = new URLSearchParams(window.location.search);

export const postsState = {
    skip: 0,
    customPostId: query.get("id")
}

export async function renderPosts(posts = []) {
    const postsContainer = $("#posts-container");
    postsContainer.empty();

    // No data
    if (!Array.isArray(posts) || posts.length <= 0) {
        $("<div>")
            .addClass("state-nothing-found")
            .html("<b>No posts found!</b>")
            .appendTo(postsContainer);
        return;
    }

    // Render data
    const fragment = new DocumentFragment();

    posts.forEach(post => {
        const safePost = post || {};
        const safeBy = safePost.by || {};
        const card = $("<div>").addClass("card").appendTo(fragment);
        const header = $("<div>").addClass("space-between").appendTo(card);

        // Header
        $("<h2>")
            .addClass("overflow")
            .text(capitalize(safePost.title) || "No title found")
            .appendTo(header);

        const icons = $("<div>").addClass("center");
        header.append(icons);

        $("<i>")
            .addClass("fas fa-bookmark post-icon")
            .attr({ role: "button", tabindex: "0" })
            .on("click", lockEvent(async function () {
                const bookmarkResponse = await sendRequest({
                    url: `/api/v1/bookmarks/${safePost._id}`,
                    method: "POST"
                });

                if (!bookmarkResponse.success) return Alert.error({ text: bookmarkResponse.error });
                Alert.success({ text: "Post bookmarked!" });
            }))
            .appendTo(icons);

        $("<i>")
            .addClass("fas fa-link post-icon")
            .attr({ role: "button", tabindex: "0" })
            .on("click", async function () {
                copy(generatePostLink(safePost._id));
            })
            .appendTo(icons);

        // Content
        $("<div>")
            .addClass("post-content")
            .html(renderSafeHtml(safePost.content) || "No content found")
            .appendTo(card);

        // Author
        $("<p>")
            .css({ color: "red", cursor: "pointer" })
            .attr("role", "button")
            .attr("tabindex", "0")
            .text(`Created by: ${capitalize(safeBy.username) || "Someone"}`)
            .on("click", lockEvent(async function () {
                await showProfile(safeBy._id);
            }))
            .appendTo(card);

        // Actions
        const reactions = $("<div>").addClass("reactions-container");
        card.append(reactions);
        const likes = Number(safePost.likes) || 0;

        $("<button>")
            .html(`<i class="fas fa-thumbs-up"></i> <span class="likes-count">${likes}</span>`)
            .on("click", lockEvent(async function () {
                const likesResponse = await sendRequest({
                    url: `/api/v1/posts/${safePost._id}/like`,
                    method: "POST"
                });

                if (likesResponse.error) return Alert.error({ text: likesResponse.error });

                $(this).find(".likes-count").text(likes + 1);
                Alert.success({ text: "Post liked!" });
            }))
            .appendTo(reactions);

        $("<button>")
            .html(`<i class="fas fa-comments"></i>`)
            .on("click", lockEvent(async function () {
                await showComments(safePost._id);
            }))
            .appendTo(reactions);

        $("<button>")
            .html(`<i class="fas fa-comment-medical"></i>`)
            .on("click", lockEvent(async function () {
                const instance = new CommentEditor("Add comment");
                const result = await instance.open();
                if (!result.isConfirmed) return;

                // Send request
                const response = await sendRequest({
                    url: `/api/v1/posts/${safePost._id}/comments`,
                    method: "POST",
                    body: {
                        content: result.value
                    }
                });

                if (!response.success) return Alert.error({ text: response.error });
                Alert.success({ text: "Comment added!" });
            }))
            .appendTo(reactions);
    });

    postsContainer.append(fragment);
}

export async function getPosts(postId = null) {
    const data = await sendRequest({
        url: postId ?
            `/api/v1/posts/${postId}` :
            `/api/v1/posts/?skip=${postsState.skip}`,
    });
    
    if (!data.success) return Alert.error({ text: data.error });
    renderPosts(data.posts);
}