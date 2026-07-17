package com.aicompiler.compiler;

import com.aicompiler.compiler.dto.SubmissionRequest;
import com.aicompiler.compiler.dto.SubmissionResult;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/compiler")
public class CompilerController {

    private final CompilerService compilerService;

    public CompilerController(CompilerService compilerService) {
        this.compilerService = compilerService;
    }

    @PostMapping("/run")
    public ResponseEntity<SubmissionResult> run(@Valid @RequestBody SubmissionRequest request) {
        return ResponseEntity.ok(compilerService.run(request));
    }
}
