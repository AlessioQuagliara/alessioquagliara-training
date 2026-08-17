# Tabellone Torneo Fight Club (aggiornato)

Thomas è stato spostato nella categoria Leggero a 75 kg, quindi gli accoppiamenti sono stati aggiornati di conseguenza.

## Partecipanti

| Chi | Stile | Entrata | Soprannome | Peso | Quota | Categoria |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| ALAIN | | | | 69 | x | Leggero |
| ALESSIO Q. | | | | 63 | x | Leggero |
| CHRISTIAN Q. | | | | 72 | x | Leggero |
| FRATELLO SEV. | | | | 74 | x | Leggero |
| GIUSEPPE VET. | | | | 68 | x | Leggero |
| MARCO BAL. | | | | 73 | x | Leggero |
| MATTEO SEV. | | | | 74 | x | Leggero |
| TOMMASO T. | | | | 60 | x | Leggero |
| THOMAS | | | | 75 | x | Leggero |
| CHICCO | | | | 79 | x | Medio |
| DIMAX | | | | 78 | x | Medio |
| HERNAN | | | | 80 | x | Medio |
| DANIELE C. | | | | 84 | x | Medio |
| IL RAGA | | | | 85 | x | Medio |
| MATTEO VIS. | | | | 110 | x | Pesante |
| MATTIA LEO. | | | | 100 | x | Pesante |

### Dettagli Scommesse
* **Premio in palio:** 266,67 €
* **Puntata minima:** 10,00 €
* **Quantità scommettitori:** 15

### Categorie di Peso
* **Leggero:** 0-75 kg
* **Medio:** 76-85 kg
* **Pesante:** 85-120 kg

## Categoria Leggero

```mermaid
flowchart LR
    subgraph Torneo_Leggero
        LQ1A["GIUSEPPE VET."] --> LQ1["Match 1"]
        LQ1B["FRATELLO SEV."] --> LQ1
        LQ1 --> LS1["Semifinale 1"]
        
        LQ2A["TOMMASO T."] --> LQ2["Match 2"]
        LQ2B["ALAIN"] --> LQ2
        LQ2 --> LS1
        
        LQ3A["MARCO BAL."] --> LQ3["Match 3"]
        LQ3B["ALESSIO Q."] --> LQ3
        LQ3 --> LS2["Semifinale 2"]
        
        LQ4A["CHRISTIAN Q."] --> LQ4["Match 4"]
        LQ4B["MATTEO SEV."] --> LQ4
        LQ4 --> LS2
        
        LWB["THOMAS (wildcard 75 kg)"] --> LQ4
        
        LS1 --> LF["Finale Leggero"]
        LS2 --> LF
        LF --> LC["Campione Leggero"]
    end
```

## Categoria Medio

```mermaid
flowchart LR
    subgraph Torneo_Medio
        MQ1A["CHICCO"] --> MQ1["Match 1"]
        MQ1B["DIMAX"] --> MQ1
        MQ1 --> MS1["Finale Medio"]
        MQ2A["HERNAN"] --> MQ2["Match 2"]
        MQ2B["DANIELE C."] --> MQ2
        MQ2 --> MS1
        MQ3["IL RAGA (attende o match extra)"] --> MS1
        MS1 --> MC["Campione Medio"]
    end
```

## Categoria Pesante

```mermaid
flowchart LR
    subgraph Torneo_Pesante
        PQ1A["MATTEO VIS."] --> PQ1["Match 1"]
        PQ1B["MATTIA LEO."] --> PQ1
        PQ1 --> PF["Campione Pesante"]
    end
```
