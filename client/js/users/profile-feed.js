import PostEditor from "../posts/post-editor.js";
import {
    copy,
    renderSafeHtml,
    generatePostLink,
    sendRequest,
    $,
    capitalizeFirstLetter,
    lockEvent,
    Alert
} from "../utils.js";

export async function getProfilePosts(userId, skip) {
    const response = await sendRequest({
        url: `/api/v1/users/${userId}/posts/?skip=${skip}`
    });;

    return response;
}

export async function renderProfilePosts(state = {}, preFetchedResponse = null) {
    const response = preFetchedResponse || await getProfilePosts(state.user.id, state.skip);
    if (response && !response.success) return Alert.error({ text: response.error });

    // Clear container
    $(state.container).empty();

    // No data
    if (!Array.isArray(response?.posts) || response.posts.length <= 0) {
        $("<div>")
            .addClass("state-nothing-found")
            .html("<b>No posts yet.</b>")
            .appendTo(state.container);
        return;
    }

    // Render data
    const fragment = new DocumentFragment();

    response.posts.forEach(post => {
        const safePost = post || {};
        const card = $("<div>").addClass("card").appendTo(fragment);
        const header = $("<div>").addClass("space-between").appendTo(card);

        // Header
        $("<h2>")
            .addClass("overflow")
            .text(capitalizeFirstLetter(safePost.title) || "Untitled post")
            .appendTo(header);

        $("<i>")
            .addClass("fas fa-link post-icon")
            .attr({ role: "button", tabindex: "0" })
            .on("click", async function () {
                copy(generatePostLink(safePost._id));
            })
            .appendTo(header);

        // Content
        $("<div>")
            .addClass("post-content")
            .html(renderSafeHtml(safePost.content) || "Not content found")
            .appendTo(card);

        // Actions
        if (state.user.isLoggedInUser) {
            $("<small>")
                .css("color", "dimgray")
                .html(`(Private): <span style='color: ${safePost.private ? "green" : "red"}'>${safePost.private ? "Yes" : "No"}</span>`)
                .appendTo(card);

            const buttons = $("<div>").addClass("center-overflow");
            card.append(buttons);

            $("<button>")
                .addClass("btn-danger w-full")
                .html("<i class='fas fa-trash'></i>")
                .on("click", lockEvent(async function () {
                    const response = await sendRequest({
                        url: `/api/v1/posts/${safePost._id}/delete`,
                        method: "DELETE"
                    });

                    if (!response.success) return Alert.error({ text: response.error });
                    Alert.success({ text: "Post deleted!" });
                }))
                .appendTo(buttons);

            $("<button>")
                .addClass("w-full")
                .html("<i class='fas fa-edit'></i>")
                .on("click", lockEvent(async function () {
                    const instance = new PostEditor("Update post", post);
                    const result = await instance.open();
                    if (!result.isConfirmed) return;

                    // Send request
                    const response = await sendRequest({
                        url: `/api/v1/posts/${safePost._id}/update`,
                        method: "PUT",
                        body: result.value
                    });

                    if (!response.success) return Alert.error({ text: response.error });
                    if (!response.changed) return Alert.info({ text: "No changed were made!" });
                    
                    Alert.success({ text: "Post updated!" });
                }))
                .appendTo(buttons);

            $("<button>")
                .addClass("w-full")
                .html(`<i class='fas fa-${safePost.private ? "eye" : "eye-slash"}'></i>`)
                .on("click", lockEvent(async function () {
                    const response = await sendRequest({
                        url: `/api/v1/posts/${safePost._id}/visibility`,
                        method: "PUT",
                        body: { value: !safePost.private }
                    });

                    if (!response.success) return Alert.error({ text: response.error });
                    if (!response.changed) return Alert.info({ text: "No changed were made!" });

                    Alert.success({ text: `Post visibility set as ${safePost.private ? "public" : "private"}!` });
                }))
                .appendTo(buttons);
        }
    });

    $(state.container).append(fragment);
}