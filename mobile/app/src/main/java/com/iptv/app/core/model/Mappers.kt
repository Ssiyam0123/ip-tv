package com.iptv.app.core.model

fun UserDto.toDomain() = User(
    id = id,
    email = email,
    displayName = displayName,
    avatarUrl = avatarUrl,
    role = role,
    createdAt = createdAt
)

fun CategoryDto.toDomain() = Category(
    id = id,
    name = name,
    slug = slug,
    sortOrder = sortOrder
)

fun CategoryRefDto.toDomain() = CategoryRef(
    id = id,
    name = name,
    slug = slug
)

fun ChannelDto.toDomain() = Channel(
    id = id,
    title = title,
    slug = slug,
    description = description,
    logoUrl = logoUrl,
    status = ChannelStatus.from(status),
    language = language,
    countryCode = countryCode,
    category = category?.toDomain()
)

fun ChannelDetailDto.toDomain() = ChannelDetail(
    id = id,
    title = title,
    slug = slug,
    description = description,
    logoUrl = logoUrl,
    status = ChannelStatus.from(status),
    language = language,
    countryCode = countryCode,
    category = category?.toDomain(),
    streamSources = streamSources.map { it.toDomain() }
)

fun StreamSourceDto.toDomain() = StreamSource(
    id = id,
    quality = quality,
    priority = priority,
    status = status
)

fun PlaybackSessionDto.toDomain() = PlaybackSession(
    sessionId = sessionId,
    channelId = channelId,
    expiresAt = expiresAt,
    sources = sources.map { it.toDomain() }
)

fun PlaybackSourceDto.toDomain() = PlaybackSource(
    sourceId = sourceId,
    playbackUrl = playbackUrl,
    quality = quality,
    priority = priority
)

fun FavoriteDto.toDomain() = Favorite(
    id = id,
    createdAt = createdAt,
    channel = channel.toDomain()
)

fun FavoriteChannelDto.toDomain() = FavoriteChannel(
    id = id,
    title = title,
    slug = slug,
    logoUrl = logoUrl,
    status = status,
    category = category?.toDomain()
)

fun MatchDto.toDomain() = Match(
    id = id,
    sport = Sport.from(sport),
    state = MatchState.from(state),
    startTime = startTime,
    homeScore = homeScore,
    awayScore = awayScore,
    currentPeriod = currentPeriod,
    competition = competition.toDomain(),
    homeTeam = homeTeam.toDomain(),
    awayTeam = awayTeam.toDomain(),
    snapshots = snapshots?.map { it.toDomain() }
)

fun CompetitionDto.toDomain() = Competition(
    id = id,
    name = name,
    slug = slug,
    sport = sport,
    country = country,
    logoUrl = logoUrl
)

fun TeamDto.toDomain() = Team(
    id = id,
    name = name,
    shortName = shortName,
    logoUrl = logoUrl
)

fun SnapshotDto.toDomain() = Snapshot(
    version = version,
    capturedAt = capturedAt
)
