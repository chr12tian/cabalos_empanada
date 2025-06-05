"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

const DEFAULT_NUM_LANES = 7
const MAX_NUM_LANES = 9
const TRACK_LENGTH = 80
const GAME_SPEED = 300 // ms between updates

// Tipos para las características de los caballos
interface HorseStats {
  name: string
  baseSpeed: number // Velocidad base (0.5-1.5)
  endurance: number // Resistencia a la fatiga (0.5-1.5)
  burstChance: number // Probabilidad de ráfaga de velocidad (0-0.2)
  burstPower: number // Potencia de la ráfaga (1.5-3)
  color: string // Color para identificación
  imageUrl: string // URL de la imagen del caballo
}

// Nombres de caballos para mayor inmersión
const HORSE_NAMES = ["Christian", "Juan", "Angel", "Daniel", "Simon", "Camilo", "Julio", "Diana", "Vlad"]

// Colores para los caballos
const HORSE_COLORS = [
  "text-red-500",
  "text-blue-500",
  "text-green-500",
  "text-yellow-500",
  "text-purple-500",
  "text-pink-500",
  "text-orange-500",
  "text-teal-500",
  "text-indigo-500",
  "text-rose-500",
  "text-emerald-500",
  "text-amber-500",
]

// Replace the DEFAULT_HORSE_IMAGES array with a mapping of horse names to image URLs
const DEFAULT_HORSE_IMAGES = {
  Christian: "https://i.postimg.cc/P585mMKm/horse-chr-removebg-preview.png",
  Juan: "https://i.postimg.cc/K8nyGpJs/Juan-removebg-preview.png",
  Angel: "https://i.postimg.cc/dVMYKcmy/Angel-removebg-preview.png",
  Daniel: "https://i.postimg.cc/wBQHV4Ns/Daniel-removebg-preview.png",
  Simon: "https://i.postimg.cc/6pmmK5vc/caballo-simon.png",
  Camilo: "https://i.postimg.cc/0NP1bG45/Camilo-removebg-preview.png",
  Julio: "https://i.postimg.cc/0NnRmMgY/Julio-removebg-preview.png",
  Diana: "https://i.postimg.cc/G275bVVY/Diana-removebg-previe.png",
  Vlad: "https://i.postimg.cc/X7GF3RQ5/Vlad.png",
}

// Interface for last place finishers
interface LastPlaceFinisher {
  name: string
  rank: number
  imageUrl: string
  color: string
  lane: number
}

export default function HorseRacing() {
  // Estado para el número de participantes
  const [numLanes, setNumLanes] = useState<number>(DEFAULT_NUM_LANES)
  const [showParticipantsDialog, setShowParticipantsDialog] = useState<boolean>(true)

  // Estados dinámicos basados en el número de participantes
  const [positions, setPositions] = useState<number[]>([])
  const [finished, setFinished] = useState<boolean[]>([])
  const [ranks, setRanks] = useState<(number | null)[]>([])
  const [nextRank, setNextRank] = useState<number>(1)
  const [isRacing, setIsRacing] = useState<boolean>(false)
  const [gameOver, setGameOver] = useState<boolean>(false)
  const [horseStats, setHorseStats] = useState<HorseStats[]>([])
  const [fatigue, setFatigue] = useState<number[]>([])
  const [raceTime, setRaceTime] = useState<number>(0)
  const [trackConditions, setTrackConditions] = useState<number[]>([])
  const [recentEvents, setRecentEvents] = useState<string[]>([])
  const [showSetupDialog, setShowSetupDialog] = useState<boolean>(false)
  const [customHorseNames, setCustomHorseNames] = useState<string[]>([])
  const [customHorseImages, setCustomHorseImages] = useState<string[]>([])
  // New state for last place dialog
  const [showLastPlaceDialog, setShowLastPlaceDialog] = useState<boolean>(false)
  const [lastPlaceFinishers, setLastPlaceFinishers] = useState<LastPlaceFinisher[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Inicializar estados basados en el número de participantes
  useEffect(() => {
    if (numLanes > 0) {
      setPositions(Array(numLanes).fill(0))
      setFinished(Array(numLanes).fill(false))
      setRanks(Array(numLanes).fill(null))
      setFatigue(Array(numLanes).fill(0))
      setCustomHorseNames(Array(numLanes).fill(""))
      setCustomHorseImages(Array(numLanes).fill(""))
    }
  }, [numLanes])

  // Inicializar condiciones de pista
  useEffect(() => {
    // Crear secciones de pista con diferentes condiciones
    const conditions = Array(TRACK_LENGTH)
      .fill(0)
      .map(() => (Math.random() < 0.7 ? 1 : Math.random() < 0.5 ? 0.8 : 1.2))
    setTrackConditions(conditions)
  }, [])

  // Game loop
  useEffect(() => {
    if (isRacing && !gameOver) {
      timerRef.current = setInterval(() => {
        updateRace()
        setRaceTime((prev) => prev + 1)
      }, GAME_SPEED)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isRacing, gameOver])

  // Check if all horses have finished
  useEffect(() => {
    if (isRacing && finished.length > 0 && finished.every((status) => status)) {
      setGameOver(true)
      setIsRacing(false)

      // Find the last place finishers
      findLastPlaceFinishers()
    }
  }, [finished, isRacing])

  // Find the last place finishers
  const findLastPlaceFinishers = () => {
    if (horseStats.length === 0 || ranks.length === 0) return

    const results = ranks
      .map((rank, index) => ({
        rank,
        lane: index + 1,
        name: horseStats[index]?.name || `Caballo ${index + 1}`,
        color: horseStats[index]?.color || "",
        imageUrl: horseStats[index]?.imageUrl || "",
      }))
      .filter((item) => item.rank !== null)
      .sort((a, b) => (b.rank || 0) - (a.rank || 0)) // Sort in descending order to get last places first

    // Get the two last place finishers (if there are at least 2 horses)
    const lastTwo = results.slice(0, Math.min(2, results.length))

    setLastPlaceFinishers(lastTwo as LastPlaceFinisher[])
    setShowLastPlaceDialog(true)
  }

  // Confirmar el número de participantes
  const confirmParticipants = () => {
    setShowParticipantsDialog(false)
    setShowSetupDialog(true)
  }

  // Generar estadísticas aleatorias para los caballos
  const generateHorseStats = () => {
    const shuffledNames = [...HORSE_NAMES].sort(() => Math.random() - 0.5)
    const shuffledColors = [...HORSE_COLORS].sort(() => Math.random() - 0.5)

    return Array(numLanes)
      .fill(0)
      .map((_, index) => {
        // Usar nombre personalizado si existe, o uno aleatorio si está vacío
        const name =
          customHorseNames[index] && customHorseNames[index].trim() !== ""
            ? customHorseNames[index]
            : shuffledNames[index % shuffledNames.length]

        const imageUrl =
          customHorseImages[index] && customHorseImages[index].trim() !== ""
            ? customHorseImages[index]
            : DEFAULT_HORSE_IMAGES[name] || `/placeholder.svg?height=32&width=32&text=${name}`

        return {
          name,
          baseSpeed: 0.5 + Math.random(), // 0.5-1.5
          endurance: 0.5 + Math.random(), // 0.5-1.5
          burstChance: Math.random() * 0.2, // 0-0.2 (20% máximo)
          burstPower: 1.5 + Math.random() * 1.5, // 1.5-3
          color: shuffledColors[index % shuffledColors.length],
          imageUrl,
        }
      })
  }

  const updateRace = () => {
    setPositions((prevPositions) => {
      const newPositions = [...prevPositions]
      const newFinished = [...finished]
      const newRanks = [...ranks]
      const newFatigue = [...fatigue]
      const currentFinishers: number[] = []
      let currentNextRank = nextRank
      const newEvents: string[] = []

      // Move each horse
      for (let i = 0; i < numLanes; i++) {
        if (!newFinished[i]) {
          const horse = horseStats[i]

          // Calcular fatiga (aumenta con el tiempo y la posición)
          const fatigueFactor = Math.min(0.5, newFatigue[i] / (horse.endurance * 20))
          newFatigue[i] += 0.1 + Math.random() * 0.1

          // Obtener condición de la pista en la posición actual
          const trackPosition = Math.min(Math.floor(newPositions[i]), TRACK_LENGTH - 1)
          const trackFactor = trackConditions[trackPosition]

          // Calcular movimiento base
          const moveChance = horse.baseSpeed * (1 - fatigueFactor) * trackFactor

          // Determinar distancia de movimiento (0-3)
          let moveDistance = 0
          const moveRoll = Math.random()

          if (moveRoll < moveChance * 0.7) moveDistance = 1
          if (moveRoll < moveChance * 0.4) moveDistance = 2
          if (moveRoll < moveChance * 0.15) moveDistance = 3

          // Comprobar ráfaga de velocidad
          if (Math.random() < horse.burstChance) {
            const burstDistance = Math.ceil(horse.burstPower * Math.random())
            moveDistance += burstDistance
            newEvents.push(`¡${horse.name} hace un sprint repentino! (+${burstDistance})`)
          }

          // Aplicar movimiento
          newPositions[i] += moveDistance

          // Eventos aleatorios basados en condiciones de pista
          if (trackFactor < 0.9 && moveDistance === 0 && Math.random() < 0.3) {
            newEvents.push(`${horse.name} se ralentiza en terreno difícil`)
          }
          if (trackFactor > 1.1 && moveDistance >= 2) {
            newEvents.push(`${horse.name} aprovecha el buen terreno`)
          }

          // Check if horse reached the finish line
          if (newPositions[i] >= TRACK_LENGTH) {
            newFinished[i] = true
            currentFinishers.push(i)
            newEvents.push(`¡${horse.name} cruza la meta!`)
          }
        }
      }

      // Sort horses that finished in this step
      currentFinishers.sort((a, b) => {
        if (newPositions[b] !== newPositions[a]) {
          return newPositions[b] - newPositions[a]
        }
        return a - b
      })

      // Assign final positions
      for (const horse of currentFinishers) {
        if (newRanks[horse] === null) {
          newRanks[horse] = currentNextRank
          currentNextRank++
        }
      }

      // Update other states
      setFinished(newFinished)
      setRanks(newRanks)
      setFatigue(newFatigue)
      if (currentNextRank !== nextRank) {
        setNextRank(currentNextRank)
      }

      // Actualizar eventos recientes (mantener solo los últimos 3)
      if (newEvents.length > 0) {
        setRecentEvents((prev) => [...newEvents, ...prev].slice(0, 3))
      }

      return newPositions
    })
  }

  const startRace = () => {
    // Cerrar el diálogo de configuración
    setShowSetupDialog(false)

    // Generar nuevas estadísticas para los caballos usando nombres personalizados
    const newHorseStats = generateHorseStats()
    setHorseStats(newHorseStats)

    // Reiniciar condiciones de pista
    const newTrackConditions = Array(TRACK_LENGTH)
      .fill(0)
      .map(() => (Math.random() < 0.7 ? 1 : Math.random() < 0.5 ? 0.8 : 1.2))
    setTrackConditions(newTrackConditions)

    // Reiniciar estados
    setPositions(Array(numLanes).fill(0))
    setFinished(Array(numLanes).fill(false))
    setRanks(Array(numLanes).fill(null))
    setNextRank(1)
    setFatigue(Array(numLanes).fill(0))
    setRaceTime(0)
    setRecentEvents([])
    setGameOver(false)
    setIsRacing(true)
    setShowLastPlaceDialog(false)
    setLastPlaceFinishers([])
  }

  const openSetupDialog = () => {
    // Reiniciar nombres e imágenes personalizados si es una nueva carrera después de terminar una
    if (gameOver) {
      setCustomHorseNames(Array(numLanes).fill(""))
      setCustomHorseImages(Array(numLanes).fill(""))
    }
    setShowSetupDialog(true)
  }

  const handleNameChange = (index: number, name: string) => {
    const newNames = [...customHorseNames]
    newNames[index] = name
    setCustomHorseNames(newNames)
  }

  const handleImageChange = (index: number, imageUrl: string) => {
    const newImages = [...customHorseImages]
    newImages[index] = imageUrl
    setCustomHorseImages(newImages)
  }

  const generateRandomNames = () => {
    const shuffledNames = [...HORSE_NAMES].sort(() => Math.random() - 0.5)
    setCustomHorseNames(
      Array(numLanes)
        .fill(0)
        .map((_, i) => shuffledNames[i % shuffledNames.length]),
    )
  }

  const renderTrack = (lane: number) => {
    const trackDots = Array(TRACK_LENGTH).fill("·")

    // Colorear la pista según las condiciones
    const coloredTrack = trackDots.map((dot, idx) => {
      const condition = trackConditions[idx]
      if (condition < 0.9)
        return (
          <span key={idx} className="text-blue-400">
            {dot}
          </span>
        )
      if (condition > 1.1)
        return (
          <span key={idx} className="text-green-400">
            {dot}
          </span>
        )
      return <span key={idx}>{dot}</span>
    })

    const pos = Math.min(Math.floor(positions[lane]), TRACK_LENGTH - 1)
    const horse = horseStats[lane]

    if (!horse) return null

    // Renderizar la imagen del caballo o el emoji por defecto
    const renderHorseImage = () => {
      if (horse.imageUrl) {
        return (
          <div className="inline-block h-20 w-20 align-middle relative z-10 shadow-lg rounded-md overflow-hidden border-2 border-primary">
            <img
              src={horse.imageUrl || "/placeholder.svg"}
              alt={horse.name}
              className="h-full w-full object-cover"
              onError={(e) => {
                // Si la imagen falla, mostrar el emoji por defecto
                ;(e.target as HTMLImageElement).style.display = "none"
                ;(e.target as HTMLImageElement).nextSibling!.textContent = "🏇"
                ;(e.target as HTMLImageElement).nextSibling!.className = horse.color
              }}
            />
            <span className="hidden">🏇</span>
          </div>
        )
      }
      return <span className={`${horse.color} text-2xl`}>🏇</span>
    }

    if (positions[lane] < TRACK_LENGTH) {
      // Insertar el caballo en la posición correcta
      coloredTrack[pos] = <span key={`horse-${lane}`}>{renderHorseImage()}</span>

      return (
        <div className="flex items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`mr-2 w-24 truncate font-medium ${horse.color}`}>{horse.name}:</span>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1 text-xs">
                  <p>Velocidad: {horse.baseSpeed.toFixed(2)}</p>
                  <p>Resistencia: {horse.endurance.toFixed(2)}</p>
                  <p>Prob. Sprint: {(horse.burstChance * 100).toFixed(0)}%</p>
                  <p>Fatiga: {fatigue[lane].toFixed(1)}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span className="font-mono">|{coloredTrack}|</span>
          {finished[lane] && (
            <Badge variant="outline" className="ml-2">
              {ranks[lane]}º lugar
            </Badge>
          )}
        </div>
      )
    } else {
      return (
        <div className="flex items-center">
          <span className={`mr-2 w-24 truncate font-medium ${horse.color}`}>{horse.name}:</span>
          <span className="font-mono">
            |{coloredTrack}|{renderHorseImage()}
          </span>
          {finished[lane] && (
            <Badge variant="outline" className="ml-2">
              {ranks[lane]}º lugar
            </Badge>
          )}
        </div>
      )
    }
  }

  const renderResults = () => {
    if (!gameOver) return null

    const results = ranks
      .map((rank, index) => ({
        rank,
        lane: index + 1,
        name: horseStats[index]?.name || `Caballo ${index + 1}`,
        color: horseStats[index]?.color || "",
        imageUrl: horseStats[index]?.imageUrl || "",
      }))
      .filter((item) => item.rank !== null)
      .sort((a, b) => (a.rank || 0) - (b.rank || 0))

    return (
      <div className="mt-4 p-4 bg-muted rounded-md">
        <h3 className="text-lg font-bold mb-2">RESULTADOS FINALES:</h3>
        <ul className="space-y-2">
          {results.map(({ rank, lane, name, color, imageUrl }) => (
            <li key={lane} className="flex items-center gap-2">
              <span className="font-bold">{rank}º lugar:</span>
              {imageUrl ? (
                <div className="h-12 w-12">
                  <img
                    src={imageUrl || "/placeholder.svg"}
                    alt={name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = "none"
                      ;(e.target as HTMLImageElement).nextSibling!.textContent = "🏇"
                    }}
                  />
                  <span className="hidden">🏇</span>
                </div>
              ) : (
                <span className={color}>🏇</span>
              )}
              <span className={`${color}`}>{name}</span>
              <span className="text-muted-foreground">(Carril {lane})</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const renderEvents = () => {
    if (recentEvents.length === 0) return null

    return (
      <div className="mt-4 p-2 bg-muted/50 rounded-md text-sm">
        <h4 className="font-semibold mb-1">Eventos recientes:</h4>
        <ul>
          {recentEvents.map((event, idx) => (
            <li key={idx} className="text-xs">
              {event}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  // Reiniciar todo el juego (incluyendo el número de participantes)
  const resetGame = () => {
    setGameOver(false)
    setIsRacing(false)
    setShowParticipantsDialog(true)
  }

  return (
    <Card className="w-full max-w-5xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center text-2xl">CARRERA DE CABALLOS</CardTitle>
        {isRacing && <div className="text-center text-sm text-muted-foreground">Tiempo: {raceTime}s</div>}
      </CardHeader>
      <CardContent>
        <div className="space-y-2 font-mono">
          {horseStats.length > 0 &&
            Array.from({ length: numLanes }).map((_, index) => (
              <div key={index} className={finished[index] ? "text-primary" : ""}>
                {renderTrack(index)}
              </div>
            ))}
        </div>
        {renderEvents()}
        {renderResults()}

        <div className="mt-4 text-xs text-muted-foreground">
          <p>
            Leyenda de pista: <span className="text-blue-400">·</span> terreno difícil,{" "}
            <span className="text-green-400">·</span> terreno favorable
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-center gap-2">
        <Button onClick={openSetupDialog} disabled={isRacing} size="lg" className="px-8">
          {gameOver ? "Nueva Carrera" : "Configurar Carrera"}
        </Button>
        {gameOver && (
          <Button onClick={resetGame} variant="outline" size="lg">
            Cambiar Participantes
          </Button>
        )}
      </CardFooter>

      {/* Diálogo para seleccionar número de participantes */}
      <Dialog open={showParticipantsDialog} onOpenChange={setShowParticipantsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Número de Participantes</DialogTitle>
            <DialogDescription>Selecciona cuántos caballos participarán en la carrera (máximo 9).</DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-6">
            <div className="flex flex-col space-y-4">
              <Label htmlFor="num-participants" className="text-center text-lg">
                {numLanes} Participantes
              </Label>

              <RadioGroup
                defaultValue={numLanes.toString()}
                onValueChange={(value) => setNumLanes(Number.parseInt(value))}
                className="grid grid-cols-3 gap-4"
              >
                {Array.from({ length: MAX_NUM_LANES }).map((_, i) => {
                  const value = i + 1
                  return (
                    <div key={value} className="flex items-center space-x-2">
                      <RadioGroupItem value={value.toString()} id={`option-${value}`} />
                      <Label htmlFor={`option-${value}`}>{value}</Label>
                    </div>
                  )
                })}
              </RadioGroup>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={confirmParticipants} className="w-full">
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de configuración de carrera */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar Carrera</DialogTitle>
            <DialogDescription>Personaliza los nombres e imágenes de los {numLanes} caballos.</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="names" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="names">Nombres</TabsTrigger>
              <TabsTrigger value="images">Imágenes</TabsTrigger>
            </TabsList>

            <TabsContent value="names" className="max-h-[60vh] overflow-y-auto">
              <div className="grid gap-4 py-4">
                {Array.from({ length: numLanes }).map((_, index) => (
                  <div key={index} className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor={`horse-${index}`} className="text-right">
                      Caballo {index + 1}
                    </Label>
                    <Input
                      id={`horse-${index}`}
                      value={customHorseNames[index] || ""}
                      onChange={(e) => handleNameChange(index, e.target.value)}
                      className="col-span-3"
                      placeholder={`Nombre del caballo ${index + 1}`}
                    />
                  </div>
                ))}
                <Button variant="outline" onClick={generateRandomNames} className="w-full mt-2">
                  Generar Nombres Aleatorios
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="images" className="max-h-[60vh] overflow-y-auto">
              <div className="grid gap-4 py-4">
                {Array.from({ length: numLanes }).map((_, index) => (
                  <div key={index} className="grid grid-cols-5 items-center gap-4">
                    <Label htmlFor={`horse-img-${index}`} className="text-right">
                      Caballo {index + 1}
                    </Label>
                    <Input
                      id={`horse-img-${index}`}
                      value={customHorseImages[index] || ""}
                      onChange={(e) => handleImageChange(index, e.target.value)}
                      className="col-span-3"
                      placeholder="URL de la imagen"
                    />
                    <div className="h-14 w-14 border rounded overflow-hidden">
                      {customHorseImages[index] ? (
                        <img
                          src={customHorseImages[index] || "/placeholder.svg"}
                          alt={`Vista previa ${index + 1}`}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).style.display = "none"
                            ;(e.target as HTMLImageElement).nextSibling!.textContent = "🏇"
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">🏇</div>
                      )}
                      <span className="hidden">🏇</span>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground mt-2">
                  Ingresa URLs de imágenes para cada caballo. Si se deja vacío, se usará un emoji.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button onClick={startRace} className="w-full sm:w-auto">
              ¡Iniciar Carrera!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para mostrar los últimos lugares */}
      <Dialog open={showLastPlaceDialog} onOpenChange={setShowLastPlaceDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl text-red-500">¡ÚLTIMOS LUGARES!</DialogTitle>
            <DialogDescription className="text-center">Estos Maricas Perdieron y pagan empanada...</DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <div className="grid grid-cols-2 gap-4">
              {lastPlaceFinishers.map((finisher, index) => (
                <div key={index} className="flex flex-col items-center p-4 bg-muted rounded-lg">
                  <div className="h-32 w-32 mb-2 border-4 border-red-400 rounded-lg overflow-hidden">
                    {finisher.imageUrl ? (
                      <img
                        src={finisher.imageUrl || "/placeholder.svg"}
                        alt={finisher.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.display = "none"
                          ;(e.target as HTMLImageElement).nextSibling!.textContent = "🏇"
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-4xl">🏇</div>
                    )}
                    <span className="hidden">🏇</span>
                  </div>
                  <h3 className={`text-lg font-bold ${finisher.color}`}>{finisher.name}</h3>
                  <p className="text-muted-foreground">Carril {finisher.lane}</p>
                  <Badge variant="outline" className="mt-2">
                    {finisher.rank}º lugar
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowLastPlaceDialog(false)} className="w-full">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
