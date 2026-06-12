package com.iptv.app.core.network

import com.iptv.app.BuildConfig
import com.iptv.app.core.model.MatchUpdate
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.resume

@Singleton
class SocketRepository @Inject constructor() {

    private var socket: Socket? = null
    private val subscribedMatches = mutableSetOf<String>()

    fun connect(): Flow<MatchUpdate> = callbackFlow {
        val s = IO.socket(BuildConfig.WS_BASE_URL + "/scores", IO.Options().apply {
            transports = arrayOf("websocket", "polling")
            reconnection = true
            reconnectionAttempts = 5
            reconnectionDelay = 1000
        })

        socket = s

        s.on(Socket.EVENT_CONNECT) {
            // Re-subscribe to active matches
            subscribedMatches.forEach { matchId ->
                s.emit("match:subscribe", JSONObject().put("matchId", matchId))
            }
        }

        s.on("match:snapshot") { args ->
            if (args.isNotEmpty()) {
                val json = args[0] as JSONObject
                val update = jsonToMatchUpdate(json)
                trySend(update)
            }
        }

        s.on("match:update") { args ->
            if (args.isNotEmpty()) {
                val json = args[0] as JSONObject
                val update = jsonToMatchUpdate(json)
                trySend(update)
            }
        }

        s.connect()

        awaitClose {
            s.disconnect()
            socket = null
            subscribedMatches.clear()
        }
    }

    fun subscribe(matchId: String) {
        subscribedMatches.add(matchId)
        socket?.emit("match:subscribe", JSONObject().put("matchId", matchId))
    }

    fun unsubscribe(matchId: String) {
        subscribedMatches.remove(matchId)
        socket?.emit("match:unsubscribe", JSONObject().put("matchId", matchId))
    }

    fun disconnect() {
        socket?.disconnect()
        socket = null
        subscribedMatches.clear()
    }

    private fun jsonToMatchUpdate(json: JSONObject): MatchUpdate {
        return MatchUpdate(
            matchId = json.optString("matchId", ""),
            version = json.optInt("version", 0),
            state = json.optString("state", ""),
            homeScore = if (json.has("homeScore")) json.optInt("homeScore") else null,
            awayScore = if (json.has("awayScore")) json.optInt("awayScore") else null,
            currentPeriod = json.optString("currentPeriod", null),
            timestamp = json.optString("timestamp", "")
        )
    }
}
